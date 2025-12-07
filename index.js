require('dotenv').config();
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const token = process.env.TOKEN;

// 稀有度設定（圖片你未來可自行更換）
const rarities = [
  { name: "白卡", rate: 70, color: 0xffffff, emoji: "⬜"},
  { name: "紫卡", rate: 20, color: 0x9b59b6, emoji: "🟪"},
  { name: "金卡", rate: 9,  color: 0xf1c40f, emoji: "🟨"},
  { name: "鑽石", rate: 1,  color: 0xe67e22, emoji: "💎"}
];

function drawRarity() {
  const roll = Math.random() * 100;
  let acc = 0;
  for (let r of rarities) {
    acc += r.rate;
    if (roll < acc) return r;
  }
}

// 單抽
function singleDraw() {
  return drawRarity();
}

// 十連抽（包含紫卡保底）
function tenDraw() {
  let results = [];

  for (let i = 0; i < 10; i++) {
    results.push(singleDraw());
  }

  const hasPurpleUp = results.some(r =>
    ["紫卡", "金卡", "鑽石"].includes(r.name)
  );

  if (!hasPurpleUp) {
    const purple = rarities.find(r => r.name === "紫卡");
    results[0] = purple;
  }

  return results;
}

// 建立 UI 按鈕
function buildButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("single")
      .setLabel("再抽一次")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ten")
      .setLabel("十連抽")
      .setStyle(ButtonStyle.Success)
  );
}

client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  if(msg.content.startsWith("!ai ")) {
    const userInput = msg.content.replace("!ai ", "").trim();

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: " You are a friendly chat bot."},
          { role: "user", content: userInput }
        ]
      });
      const answer = response.choices[0].message.content;
      return msg.reply(answer);
    }catch(e){
      console.error(e);
      return msg.reply("❌ Something wrong, please try it later.");
    }
  }
  if (msg.content === "!抽卡") {
    const r = singleDraw();
    const embed = new EmbedBuilder()
      .setTitle("🎯 抽卡結果")
      .setColor(r.color)
      .setDescription(`${r.emoji} **${r.name}**`)
      .setImage(r.img);

    msg.reply({ embeds: [embed], components: [buildButtons()] });
  }

  if (msg.content === "!十抽") {
    const rs = tenDraw();
    const goldCount = rs.filter(r => r.name === "金卡").length;
    const diamondCount = rs.filter(r => r.name === "鑽石").length;

    let comment = "";
    if(diamondCount > 0){
        comment = "💎 天選之人🤩！趕快去抽卡！"
    }else if(goldCount >= 1){
        comment = "🟨 運氣不錯👍";
    }else{
        comment = "💩 沒中，哈哈💩";
    }
    let text = "";
    rs.forEach((r, i) => text += `${i + 1}. ${r.emoji} **${r.name}**\n`);

    const embed = new EmbedBuilder()
      .setTitle("🎉 十連抽結果")
      .setColor(0x00aaff)
      .setDescription(text)
      .setFooter({text : comment});
    msg.reply({ embeds: [embed], components: [buildButtons()] });
  }
});

// 按鈕觸發事件
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "single") {
    const r = singleDraw();
    const embed = new EmbedBuilder()
      .setTitle("🎯 抽卡結果")
      .setColor(r.color)
      .setDescription(`${r.emoji} **${r.name}**`)
      .setImage(r.img);

    return interaction.update({ embeds: [embed], components: [buildButtons()] });
  }

  if (interaction.customId === "ten") {
    const rs = tenDraw();
    const goldCount = rs.filter(r => r.name === "金卡").length;
    const diamondCount = rs.filter(r => r.name === "鑽石").length;

    let comment = "";
    if(diamondCount > 0){
        comment = "💎 天選之人🤩！趕快去抽卡！"
    }else if(goldCount >= 1){
        comment = "🟨 運氣不錯👍";
    }else{
        comment = "💩 沒中，哈哈💩";
    }

    let text = "";
    rs.forEach((r, i) => text += `${i + 1}. ${r.emoji} **${r.name}**\n`);

    const embed = new EmbedBuilder()
      .setTitle("🎉 十連抽結果")
      .setColor(0x00aaff)
      .setDescription(text)
      .setFooter({text : comment});

    return interaction.update({ embeds: [embed], components: [buildButtons()] });
  }
});

client.login(token);

