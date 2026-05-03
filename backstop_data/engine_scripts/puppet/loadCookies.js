module.exports = async (page, scenario) => {
    let cookies = [];
    const cookiePath = scenario.cookiePath;

    // READ COOKIES FROM FILE IF EXISTS
    if (cookiePath) {
        try {
            const fs = require('fs');
            const path = require('path');
            const cookiesJson = fs.readFileSync(path.resolve(cookiePath));
            cookies = JSON.parse(cookiesJson);
        } catch (e) {
            console.log('Cookie file not found: ' + cookiePath);
        }
    }

    // SET COOKIES
    const mapCookies = cookies.map(cookie => ({
        ...cookie,
        url: scenario.url // Puppeteer requires URL for cookies
    }));

    if (mapCookies.length > 0) {
        await page.setCookie(...mapCookies);
        console.log('Cookie state restored with:', JSON.stringify(mapCookies, null, 2));
    }
};
