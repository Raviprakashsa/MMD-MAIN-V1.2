module.exports = async (page, scenario, vp) => {
    console.log('SCENARIO > ' + scenario.label);
    await require('./clickAndHoverHelper')(page, scenario);

    // Example: waiting for fonts or specific elements
    // await page.waitForTimeout(500);
};
