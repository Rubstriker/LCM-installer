function patch(data) {
    const { config } = data;
    if (!config.emotes) config.emotes = {
        I am a Party Pooper: false
    };

    let result = "[Emote Settings]\n";
    for (const key in config.emotes) result += `${key} = ${config.emotes[key]}\n`;

    return result;
}