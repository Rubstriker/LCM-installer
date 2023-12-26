function patch(data) {
    const { config } = data;
    if (!config.camera) config.camera = {
        monitorResolution: 0,
        renderDistance: 70
    };

    let result = "[MONITOR QUALITY]\n";
    for (const key in config.camera) result += `${key} = ${config.camera[key]}\n`;

    return result;
}