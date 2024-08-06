function patch(data) {
    const { config } = data;
    if (!config.masked) config.masked = {
        "EnableOverrideSpawnChance": true
    };

    let result = "[MaskedPlayerEnemy]\n";
    for (const key in config.masked) result += `${key} = ${config.masked[key]}\n`;

    return result;
}