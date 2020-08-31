#!/usr/bin/env node
import program from 'commander';
import jsonfile from 'jsonfile';
import Sitemapper from 'sitemapper';
import { other, scenario, viewports } from './defaults.js';
const sitemap = new Sitemapper();

const combineContents = (name, scenarios = [], paths) => {
    return {
        ...{
            id: name,
            viewports: viewports,
            scenarios: scenarios,
            paths: paths,

        },
        ...other
    }
}

const createConfig = async (domain) => {
    const scenarios = []
    let res = await sitemap.fetch(`https://${domain}/sitemap.xml`)
    if (!res.sites.length) {
        console.log("Sitemap not found, trying www.", domain)
        res = await sitemap.fetch(`https://www.${domain}/sitemap.xml`)
    }
    if (res.sites.length) {
        console.log(`Sitemap ok, found ${res.sites.length} pages. Creating config`, domain)
        for (const key in res.sites) {
            if (res.sites.hasOwnProperty(key)) {
                const url = res.sites[key];
                scenarios.push({
                    ...{
                        label: url.replace(domain, '').replace("https://www.", '').replace('//', '').replace('ttps:/', '').slice(0, -1).substring(1), // Strip url except path to get page name ;)
                        url: url
                    },
                    ...scenario
                })
            }
        }
        const paths = {
            "bitmaps_reference": domain + "/bitmaps_reference",
            "bitmaps_test": domain + "/bitmaps_test",
            "engine_scripts": domain + "/engine_scripts",
            "html_report": domain + "/html_report",
            "ci_report": domain + "/ci_report"
        }
        jsonfile.writeFile(`./${domain}.json`,
            combineContents(domain, scenarios, paths),
            { spaces: 2 },
            function (err) {
                if (err) console.error(err)
            })
        console.log(`Succesfully generated config for ${res.sites.length} pages on`, domain)
        console.log("run: npm run setup", domain)
        console.log("to generate a reference report")
    } else {
        console.log(`ERROR: Sitemap not found or empty, make sure https://${domain}/sitemap.xml exist`)
    }
}

program
    .version('0.0.1')
    .description("An CLI used to generate backstop configs from sitemaps")
    .option('-h, --help', 'Show help')
    .option('-s, --site <url>', 'Set url')
    .option('-d, --domains <lang,lang>', 'Set of domains extentions to check ex; de,com')

program.parse(process.argv)
if (!program.args[0]) {
    console.log("No url was given")
    process.exit()
} else {
    program.site = program.args[0]
}
console.log("Creating config for", program.args[0])
if (program.domains) {
    program.domains = program.domains.split(",")
    createConfig(program.site)
    for (const key in program.domains) {
        if (program.domains.hasOwnProperty(key)) {
            const extension = program.domains[key].indexOf('.') ? ('.' + program.domains[key]) : program.domains[key]; // if input is .de,.com instead of de,com,es for example; add a dot
            const domain = program.site.substring(0, program.site.indexOf('.')) // Strip domain extention
            createConfig(domain + extension)
        }
    }
} else {
    createConfig(program.site)
}
