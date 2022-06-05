import { Client } from "discord.js"
import { TwitterApi } from 'twitter-api-v2';
import nodeSchedule from "node-schedule";

const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const twitter = twitterClient.readWrite.v2;

const randomItem = (arr = []) => arr[Math.floor(Math.random() * arr.length)];

const percentageChance = (percent) => {
    const randomPercent = Math.floor(Math.random() * 101);

    if(randomPercent >= percent) {
        return false;
    }

    return true;
}

// Create a new client instance
const discord = new Client({
    intents : [
        "GUILDS",
        "GUILD_MESSAGES",
        "DIRECT_MESSAGES",
        "GUILD_MESSAGE_REACTIONS",
    ],
});

// Time - when to post.
// Channel - channel to pick a random message from.
// Chance - Percent chance of posting (0-100)
const postSchedules = [
    {   
        // 6AM
        time : "0 13 * * *",

        // "#gms"
        channel : "967274303483682838",
        chance : 100,
    },
    {
        // 1PM
        time : "0 19 * * *",

        // "#random-engagement"
        channel : "967273956463759450",
        chance : 25
    },
    {
        // 6PM
        time : "0 1 * * *",

        // "#light-engagement"
        channel : "967869087118164008",
        chance : 100
    },
];

const post = async ({chance, channel : channelId}) => {
    const shouldPost = percentageChance(chance);

    if(!shouldPost) {
        return;
    }

    const channel = discord.channels.cache.get(channelId);

    const messages = await channel.messages.fetch({limit : 100 })

    const messageContents = messages.map(({ content }) => content);

    const message = randomItem(messageContents);

    await twitter.tweet(message);
}

const goLiking = async () => {
    try {
        const searchKeywords = process.env.SEARCH_KEYWORDS.split("__")
            .filter((item) => item);
        const searchHashtags = process.env.SEARCH_HASHTAGS.split("__")
            .filter((item) => item)
            .map((hashtag = "") => `#${hashtag}`);


        const searchString = [ ...searchKeywords, ...searchHashtags ].join(" OR ");

        const { data : me } = await twitter.me();
        const twitterSearch = await twitter.search(searchString);


        try {
            // Consume every possible tweet of jsTweets (until rate limit is hit)
            for await (const tweet of twitterSearch) {
                await twitter.like(me.id, tweet.id);
    
                console.log("liked tweet", tweet);
            }
        } catch (error) {
            console.log("Stopping search, failed to fetch additional Tweets.");
        }
    } catch (error) {
        console.log(error)
    }
}

discord.on("ready", async () => {
    try {
        for(const schedule of postSchedules) {
            nodeSchedule.scheduleJob(schedule.time, async () => post(schedule));
        }

        // goLiking();

        // setInterval(goLiking, (1000 * 60) * 15);
    } catch(error) {
        // eslint-disable-next-line no-console
        console.log(error);
    }
});

// Login to Discord with your client's token
discord.login(process.env.DISCORD_TOKEN);