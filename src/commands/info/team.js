import { Command } from "#structures/classes/Command";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { config } from "#config/config";
import emoji from "#config/emoji";
import { logger } from "#utils/logger";

class TeamInfoCommand extends Command {
	constructor() {
		super({
			name: "teaminfo",
			description: "Shows information about the development team.",
			usage: "teaminfo",
			aliases: ["dev", "papa", "devteam", "team"],
			category: "info",
			examples: ["teaminfo", "dev"],
			cooldown: 3,
			enabledSlash: true,
			slashData: {
				name: "teaminfo",
				description: "Get information about the development team.",
			},
		});
	}

	async execute({ message }) {
		try {
			await message.reply({
				components: [this._createTeamInfoContainer()],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (error) {
			logger.error("TeamInfoCommand", `Error in prefix command: ${error.message}`, error);
			await message.reply({
				components: [this._createErrorContainer("An error occurred while loading team information.")],
				flags: MessageFlags.IsComponentsV2,
			}).catch(() => {});
		}
	}

	async slashExecute({ interaction }) {
		try {
			await interaction.reply({
				components: [this._createTeamInfoContainer()],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (error) {
			logger.error("TeamInfoCommand", `Error in slash command: ${error.message}`, error);
			const errorPayload = {
				components: [this._createErrorContainer("An error occurred while loading team information.")],
				ephemeral: true,
			};
			if (interaction.replied || interaction.deferred) {
				await interaction.editReply(errorPayload).catch(() => {});
			} else {
				await interaction.reply(errorPayload).catch(() => {});
			}
		}
	}

	_createTeamInfoContainer() {
		const container = new ContainerBuilder();

		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(`${emoji.get('info')} **Development Team**`)
		);

		container.addSeparatorComponents(
			new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
		);

		const content = `**Meet our development team!**\n\n` +
			`**${emoji.get('check')} Developer:** Vinay Kumar ([AstrixCode](https://github.com/AstrixCode))\n` +
			`**${emoji.get('folder')} Original Base:** CodeX Development\n` +
			`**${emoji.get('add')} Bot Name:** Astrix\n` +
			`**${emoji.get('reset')} Specialization:** High-Performance Music & Utility Bot\n\n` +
			`*Maintained & customized with ❤️ for the community!*`;

		const section = new SectionBuilder()
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
			.setThumbnailAccessory(new ThumbnailBuilder().setURL(config.assets?.defaultThumbnail || config.assets?.defaultTrackArtwork));

		container.addSectionComponents(section);

		container.addSeparatorComponents(
			new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
		);

		const buttonRow = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setLabel('GitHub')
				.setStyle(ButtonStyle.Link)
				.setURL('https://github.com/AstrixCode/Astrix')
		);

		container.addActionRowComponents(buttonRow);

		return container;
	}

	_createErrorContainer(message) {
		const container = new ContainerBuilder();

		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(`${emoji.get('cross')} **Error**`)
		);

		container.addSeparatorComponents(
			new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
		);

		const section = new SectionBuilder()
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(message))
			.setThumbnailAccessory(new ThumbnailBuilder().setURL(config.assets?.defaultThumbnail || config.assets?.defaultTrackArtwork));

		container.addSectionComponents(section);

		container.addSeparatorComponents(
			new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
		);

		return container;
	}
}

export default new TeamInfoCommand();
