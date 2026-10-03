import { ContainerUI } from "#utils/ContainerUI";
import {
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js";

import { config } from "#config/config";
import { Command } from "#structures/classes/Command";
import emoji from "#config/emoji";

class OldschoolFilterCommand extends Command {
	constructor() {
		super({
			name: "oldschool",
			description: "Apply oldschool equalizer preset to the music",
			usage: "oldschool",
			aliases: [],
			category: "music",
			examples: ["oldschool"],
			cooldown: 2,
			voiceRequired: true,
			sameVoiceRequired: true,
			playerRequired: true,
			playingRequired: true,
			enabledSlash: true,
			slashData: {
				name: ["filter", "oldschool"],
				description: "Apply oldschool equalizer preset to the music",
			},
		});
	}

	async execute({ message, pm }) {
		return this._handleFilter(message, pm);
	}

	async slashExecute({ interaction, pm }) {
		return this._handleFilter(interaction, pm);
	}

	async _handleFilter(context, pm) {
		try {
			await pm.player.filterManager.setEQ([
   {
      band: 0,
      gain: 0.1
   },
   {
      band: 1,
      gain: 0.05
   },
   {
      band: 2,
      gain: 0
   },
   {
      band: 3,
      gain: -0.05
   },
   {
      band: 4,
      gain: -0.1
   },
   {
      band: 5,
      gain: -0.15
   },
   {
      band: 6,
      gain: -0.2
   },
   {
      band: 7,
      gain: -0.25
   },
   {
      band: 8,
      gain: -0.3
   },
   {
      band: 9,
      gain: -0.35
   },
   {
      band: 10,
      gain: -0.4
   },
   {
      band: 11,
      gain: -0.45
   },
   {
      band: 12,
      gain: -0.5
   },
   {
      band: 13,
      gain: -0.55
   }
]);

			return this._reply(context, this._createSuccessContainer("Oldschool"));
		} catch (error) {
			return this._reply(
				context,
				this._createErrorContainer("Could not apply the oldschool filter."),
			);
		}
	}

	_createSuccessContainer(filterName) {
		return ContainerUI.filter(filterName, "Applied");
	}

	_createErrorContainer(message) {
		return ContainerUI.error(message, "Filter Error");
	}

	async _reply(context, container) {
		return ContainerUI.reply(context, container);
	}
}

export default new OldschoolFilterCommand();