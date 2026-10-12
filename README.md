# Break the Bot

A browser game where you try to trick a chatbot into giving up its secret word. There are 10 levels, and each one adds a new defense. You can switch between a small AI model (1B) and a bigger one (3B) to see how model size changes how easy the bot is to fool.

It's a follow-up to my [llm-audit](https://github.com/PXRI-hub/llm-audit) project, where I tested AI chatbots for leaking secrets and obeying hidden instructions. This game lets other people try the same kind of attacks themselves.

**Status: work in progress.** The game runs and all 10 levels exist, but I'm still playtesting the difficulty.

![The game's main screen](screenshots/main-screen.png)

## How to play

1. Pick a level (1 to 10) and a model (1B or 3B) at the top.
2. Chat with the bot and try to get it to say its secret word.
3. If the bot says the word in its reply, you win the level. On levels where a censor blocks the word, you'll have to get it out another way (spelled differently, for example) and type your guess into the green box.
4. A popup lets you move on to the next level.

## The levels

| Level | Name | Defense |
|---|---|---|
| 1 | Wide open | None. The bot is allowed to tell you |
| 2 | Please don't | The bot is politely asked to keep the secret |
| 3 | Firm rules | The bot is told to ignore "I'm the admin" tricks |
| 4 | The reminder | A reminder not to talk is added after every message |
| 5 | The censor | Any reply containing the secret is blocked |
| 6 | Banned words | Your message can't contain "secret", "password" or "word" |
| 7 | The librarian | A grumpy librarian persona, plus a censor |
| 8 | Double lock | Banned words in your messages and a censor on the replies |
| 9 | Strict censor | The censor also catches spaced-out letters and backwards spelling |
| 10 | The fortress | Firm rules, reminders, banned words, and the strict censor together |

<img width="1746" height="993" alt="censor" src="https://github.com/user-attachments/assets/f28cf53f-78c6-47e8-8910-452b01a2c524" />

## What I found

Each level gets harder and harder. You have to play around to get a answer till it either gets manipulated OR confused/guilt tripped.

## How it works

There are three pieces, all running on my own computer:

1. **The web page (`index.html`)** is the chat window you see in the browser.
2. **A small Python server (`server.py`, built with Flask)** receives your messages, adds the level's secret rules, runs the banned-word and censor checks, and checks your guesses. The secret words stay on the server, so the browser never receives them.
3. **[Ollama](https://ollama.com)** is a free app that runs AI models locally. The server sends the conversation to Ollama and gets the model's reply.

Because the models run on my own laptop, there are no API keys and no costs, and it works offline after the models are downloaded. The trade-off is that people need to run it themselves to play.

## How to run it

**You need:**
1. [Python 3](https://www.python.org/downloads/)
2. [Ollama](https://ollama.com/download). Install it and open it once so it's running in the background.

**One-time setup:**

```
ollama pull llama3.2:1b
ollama pull llama3.2:3b
python3 -m pip install -r requirements.txt
```

The two models are about 3 GB in total, so the downloads take a few minutes.

**Start the game:**

```
python3 server.py
```

Then open http://127.0.0.1:5001 in your browser. The terminal will look like it's stuck, but that's just the server running. Press Control + C to stop it.

**Troubleshooting:**
- "Address already in use": an old copy of the server is still running. Stop it with Control + C, or run `lsof -i :5001` to find it and `kill` the number it shows.
- "Couldn't reach the server" in the chat: `server.py` isn't running.
- An error about Ollama: make sure the Ollama app is open and that you ran both `ollama pull` commands.
- I've only run this on a Mac. On other systems, `python3` may be `python`.

## Limits

- The secret words are written in `server.py`, so anyone who reads the code can see them. That's fine for a game running on your own computer.
- The game only counts a win if the bot says the word spelled normally, or if you type the right guess in the green box. 
- The "banned words" checks for words, like "passwords", as it cannot be used on certain levels.
- The bot's answers change from run to run, so a trick that works once may not work the next time.
- Chat memory is sent from the browser and only covers the last 10 messages.
- I wrote the level rules first and tested them afterward, so some levels may be easier or harder than their names suggest.
- It's a local game, not built for the public internet.

## What I want to add next

- Finish playtesting and fix the levels that are too easy or impossible
- Let the bot's replies stream in word by word like a real chat app
- Track how many attempts each level takes across players
- Try more models and add the results to the table above

## How I built it

I built this to practice making a full web app: a Python backend, a browser frontend, and a local AI model.
