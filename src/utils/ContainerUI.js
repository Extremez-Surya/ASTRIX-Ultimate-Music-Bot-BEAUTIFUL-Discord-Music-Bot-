import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} from "discord.js";
import { config } from "#config/config";
import emoji from "#config/emoji";

export class ContainerUI {
  static getThumbnail() {
    return config.assets?.helpThumbnail || config.assets?.defaultThumbnail || "https://raw.githubusercontent.com/AstrixCode/Astrix/main/thumbnail.png";
  }

  static success(description, title = "Success") {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${emoji.get("check") || "✨"} **${title}**`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(this.getThumbnail()));

    container.addSectionComponents(section);

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    return container;
  }

  static error(message, title = "Error") {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${emoji.get("cross") || "❌"} **${title}**`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const content = typeof message === "string" ? message : (message?.message || "An unexpected error occurred.");
    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(this.getThumbnail()));

    container.addSectionComponents(section);

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    return container;
  }

  static info(description, title = "Astrix") {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${emoji.get("info") || "ℹ️"} **${title}**`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(this.getThumbnail()));

    container.addSectionComponents(section);

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    return container;
  }

  static filter(filterName, status = "Applied") {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`🎛️ **Audio Filter — ${status}**`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const content = `**Filter:** \`${filterName}\`\n**Status:** Audio equalization updated smoothly.\n*Use \`.reset\` to clear all audio filters.*`;

    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(this.getThumbnail()));

    container.addSectionComponents(section);

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    return container;
  }

  static async reply(context, container, ephemeral = false) {
    const payload = {
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    };
    if (ephemeral) payload.ephemeral = true;

    try {
      if (context.deferred || context.replied) {
        return await context.followUp(payload);
      }
      return await context.reply(payload);
    } catch (e) {
      if (context.channel?.send) {
        return await context.channel.send(payload).catch(() => null);
      }
      return null;
    }
  }
}
