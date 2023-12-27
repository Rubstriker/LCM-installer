function patch(data) {
    const { config } = data;
    if (!config.masked) config.masked = {
        "Use Vanilla Spawns": false
    };

    let result = "[GENERAL]\n";
    for (const key in config.masked) result += `${key} = ${config.masked[key]}\n`;

    return result;
}