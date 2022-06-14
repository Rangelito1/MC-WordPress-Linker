const { keys, getUsersFromMention, addPh} = require('../../api/messages');
const Discord = require('discord.js');
const utils = require('../../api/utils');
const plugin = require('../../api/plugin');
const commands = require('../../resources/data/commands.json');


async function autocomplete(interaction) {
    //TODO Add some super fancy autocomplete for target selectors
    const respondArray = [];
    const focused = interaction.options.getFocused(true);


    if(focused.name === 'command') {
        Object.keys(commands).forEach(cmd => {
            if(cmd.includes(focused.value)) respondArray.push({ name: cmd, value: cmd });
        });
    } else {
        const allOptions = [...interaction.options.data];
        const commandName = allOptions[0].value.toLowerCase();
        allOptions.shift(); //Shift command name

        const placeholders = {};

        const cmdKey = Object.keys(commands).find(cmd => cmd === commandName);
        const focusedIndex = allOptions.findIndex(opt => opt.name === focused.name);

        const allSuggestions = commands[cmdKey];
        if(!allSuggestions) return;
        const suggestions = allSuggestions[focusedIndex];
        if(!suggestions) return;

        const previousArgument = allOptions?.[focusedIndex-1]?.value;


        //Suggestion key:
        //"arg2=string" => 2nd option === string
        //"string" => previous option === string
        //"arg2=string & arg1=string2" => 2nd option === string && 1st option === string2
        //"" => any previous option
        let filteredKey = findSuggestionKey(suggestions, previousArgument, allOptions);

        const filteredSuggestions = suggestions?.[filteredKey] ?? suggestions?.[''];
        if(filteredSuggestions) {
            const formattedSuggestions = [];
            for (const sug of filteredSuggestions) {
                //Replace arg[0-9] with corresponding value for placeholders
                //arg2 => value of 2nd option
                const replaced = sug.replace(/%arg(\d)_[a-zA-Z]+%/g, (match, group) => {
                    if(group < 0) group = allOptions.length + group-1; //Allow relative (negative) indexes

                    match.replace(`arg${group}`, allOptions?.[group]?.value ?? `arg${group}`);
                });

                //Run logic for each placeholder and add properties to ph object
                await addPlaceholders(replaced);
            }

            async function addPlaceholders(suggestion) {
                if(suggestion.match(/%\w+%/g)) {
                    if(suggestion.includes('_argument_')) {
                        const [command, index] = suggestion.split(/%([a-zA-Z]+)_argument_(\d)%/).filter(n => n);
                        const commandSuggestions = commands[command]?.[parseInt(index)];

                        if(commandSuggestions) {
                            const filteredCommandKey = findSuggestionKey(commandSuggestions, previousArgument, allOptions);

                            const filteredArguments = commandSuggestions[filteredCommandKey] ?? commandSuggestions[''];
                            if(filteredArguments) {
                                for(const argument of filteredArguments) await addPlaceholders(argument);

                                //Add Placeholder
                                placeholders[suggestion.replaceAll('%', '')] = filteredArguments;
                            }
                        }
                    } else {
                        const placeholder = await getPlaceholder(
                            suggestion.replaceAll('%', ''),
                            { user: interaction.user.id, guild: interaction.guildId, focused: focused.value, commands: Object.keys(commands) }
                        );
                        if(!placeholder) {
                            console.log(addPh(keys.commands.command.warnings.could_not_find_placeholders.console, { placeholder: suggestion }));
                            return;
                        }

                        //Add Placeholder
                        placeholders[suggestion.replaceAll('%', '')] = placeholder;
                    }
                }

                formattedSuggestions.push(suggestion);
            }

            const suggestionsObject = addPh(formattedSuggestions, placeholders);
            for([k, v] of Object.entries(suggestionsObject)) {
                if(k?.includes(focused.value) || v?.includes(focused.value)) respondArray.push({ name: k, value: v });
            }
        } else return;
    }

    if(respondArray.length >= 25) respondArray.length = 25;
    interaction.respond(respondArray);
}


function findSuggestionKey(suggestions, previousArgument, allOptions) {
    return Object.keys(suggestions).find(suggestion => {
        suggestion = suggestion.replaceAll(' ', ''); //Remove all whitespaces

        let returnBool = true;
        console.log(suggestion)
        suggestion.split('&').forEach(condition => {
            if (!returnBool) return;

            let [index, string] = condition.split("=", 2);
            index = parseInt(index.replace('arg', ''));
            if (index < 0) index = allOptions?.length + index-1; //Allow relative (negative) indexes

            if(!isNaN(index)) console.log(allOptions?.[index]?.value)
            returnBool = condition === previousArgument || (!isNaN(index) ? string === allOptions?.[index]?.value : false);
        });

        if(returnBool) console.log(suggestion)
        return returnBool;
    });
}


async function execute(message, args) {
    const command = args[0];
    args.shift(); //Shift commandName

    if (!message.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) {
        message.respond(keys.commands.command.warnings.no_permission);
        return;
    } else if(!command) {
        message.respond(keys.commands.command.warnings.no_command);
        return;
    }

    //Replace pings and @s with corresponding username
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        let user;
        if(arg === "@s") user = message.member.user;
        else user = getUsersFromMention(message.client, arg)?.[0];
        if(!user) continue;

        const username = await utils.getUsername(user.id, message);
        if(!username) return;

        args[i] = arg.replace(arg, username);
    }

    const resp = await plugin.execute(`${command} ${args.join(' ')}`, message);
    if(!resp) return;

    let respMessage = resp.status === 200 ? resp.json.message : keys.api.plugin.warnings.no_response_message;

    //Either '+' or '-' depending on color code
    let colorChar = '';
    if(resp.json.color === 'c' || resp.status !== 200) colorChar = '- ';
    else if(resp.json.color === 'a') colorChar = '+ ';

    //Wrap in discord code block for color
    respMessage = `\`\`\`diff\n${colorChar}${respMessage}\`\`\``;

    message.respond(keys.commands.command.success, { "response": respMessage });
}

async function getPlaceholder(key, arguments) {
    const fakeMessage = { respond: () => {} };

    //TODO add placeholders
    let placeholder;
    switch (key) {
        case 'advancements':
            const advancements = await utils.searchAllAdvancements(arguments.focused ?? '', true, true);
            //Combine to one object and map to name and category.value
            placeholder = Object.assign(...advancements.map(advancement => {
                return { [advancement.name]: `${advancement.category}.${advancement.value}` };
            }));
            break;
        case 'target_selectors':
            //TODO Replace @s with username for the value
            const onlinePlayers = ["TheAnnoying", "ReeceTD", "CommandGeek"];
            const username = await utils.getUsername(arguments.user, fakeMessage);

            placeholder = {
                "@a": "@a",
                "@p": "@p",
                "@r": "@r",
                "@e": "@e",
            };

            if(onlinePlayers) onlinePlayers.forEach(player => placeholder[player] = player);
            if(username) {
                placeholder["@s"] = username;
                placeholder[username] = username;
            }
            break;
        case 'attributes':
            placeholder = [
                "generic.max_health",
                "generic.follow_range",
                "generic.knockback_resistance",
                "generic.movement_speed",
                "generic.attack_damage",
                "generic.armor",
                "generic.armor_toughness",
                "generic.attack_knockback",
                "generic.attack_speed",
                "generic.luck",
                "horse.jump_strength",
                "generic.flying_speed",
                "zombie.spawn_reinforcements",
            ];
            break;
        case 'datapacks':
             break;
        case 'functions':
            break;
        case 'player_coordinates':
            placeholder = ['~ ~ ~'];
            break;
        case 'player_coordinates_xz':
            placeholder = ['~ ~'];
            break;
        case 'items':
            break;
        case 'blocks':
            break;
        case 'block_tags':
            break;
        case 'structure_tags':
            break;
        case 'item_tags':
            break;
        case 'biome_tags':
            break;
        case 'structures':
            break;
        case 'effects':
            break;
        case 'enchantments':
            break;
        case 'scoreboards':
            break;
        case 'bossbars':
            break;
        case 'commands':
            placeholder = arguments.commands;
            break;
        case 'slots':
            break;
        case 'loot':
            break;
        case 'sounds':
            break;
        case 'recipes':
            break;
        case 'scoreboard_displays':
            break;
        case 'scoreboard_criteria':
            break;
        case 'entities':
            break;
        case 'teams':
            break;
        case 'pois':
            break;
        case 'poi_tags':
            break;
        case 'jigsaws':
            break;
        case 'templates':
            break;
        case 'features':
            break;
        case 'colors':
            placeholder = [
                "reset",
                "black",
                "dark_blue",
                "dark_green",
                "dark_aqua",
                "dark_red",
                "dark_purple",
                "gold",
                "gray",
                "dark_gray",
                "blue",
                "green",
                "aqua",
                "red",
                "light_purple",
                "yellow",
                "white",
            ];
            break;
        case key.endsWith('_criteria'):
            break;
        case key.endsWith('_levels'):
            break;
    }

    return placeholder;
}


module.exports = { execute, autocomplete };
