function patch(data) {
    const { config } = data;
    if (!config.mimics) config.mimics = {
        "Easy Mode": false,
    };

    let result = "[Difficulty]\n";
    for (const key in config.mimics) result += `${key} = ${config.mimics[key]}\n`;

    return result;
}
