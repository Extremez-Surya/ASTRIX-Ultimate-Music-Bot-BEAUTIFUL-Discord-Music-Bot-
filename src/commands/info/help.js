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
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  ComponentType,
} from "discord.js";
import { config } from "#config/config";
import emoji from "#config/emoji";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { logger } from "#utils/logger";

const CATEGORY_META = {
  filters: {
    name: "Audio Filters",
    emoji: "🎛️",
    description: "Bassboost, nightcore, EQ & audio effects",
  },
  info: {
    name: "Information",
    emoji: "ℹ️",
    description: "Bot diagnostics, ping & support links",
  },
  music: {
    name: "Music & Playback",
    emoji: "🎵",
    description: "Streaming, queue, volume & track controls",
  },
  playlists: {
    name: "Playlists",
    emoji: "📁",
    description: "Personal saved playlist management",
  },
  premium: {
    name: "Premium",
    emoji: "⭐",
    description: "Custom user prefix & premium perks",
  },
  settings: {
    name: "Settings",
    emoji: "⚙️",
    description: "Prefix, 24/7 stay mode & volume setup",
  },
  Spotify: {
    name: "Spotify",
    emoji: "🎧",
    description: "Spotify account linking & playlists",
  },
};

class HelpCommand extends Command {
  constructor() {
    super({
      name: "help",
      description: "Shows all available commands and their information",
      usage: "help [command]",
      aliases: ["h", "commands"],
      category: "info",
      examples: ["help", "help play", "help music", "h skip"],
      cooldown: 3,
      enabledSlash: true,
      slashData: {
        name: "help",
        description: "Get help for commands",
        options: [
          {
            name: "command",
            description: "Specific command to get help for",
            type: 3,
            required: false,
            autocomplete: true,
          },
        ],
      },
    });
    this.cachedData = null;
  }

  async _scanCommandDirectories() {
    if (this.cachedData && this.cachedData.commands.size > 0) {
      return this.cachedData;
    }

    try {
      const commandsPath = path.join(process.cwd(), "src", "commands");
      const commands = new Map();
      const categories = new Map();
      const subcategories = new Map();

      if (!fs.existsSync(commandsPath)) {
        logger.warn("HelpCommand", "Commands directory not found");
        return { commands, categories, subcategories };
      }

      const categoryDirs = fs
        .readdirSync(commandsPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name) => name !== "developer");

      for (const categoryName of categoryDirs) {
        const categoryPath = path.join(commandsPath, categoryName);

        if (!categories.has(categoryName)) {
          categories.set(categoryName, []);
        }

        await this._scanCategoryDirectory(
          categoryPath,
          categoryName,
          commands,
          categories,
          subcategories,
        );
      }

      this.cachedData = { commands, categories, subcategories };
      return this.cachedData;
    } catch (error) {
      logger.error("HelpCommand", "Error scanning command directories:", error);
      return {
        commands: new Map(),
        categories: new Map(),
        subcategories: new Map(),
      };
    }
  }

  async _scanCategoryDirectory(
    categoryPath,
    categoryName,
    commands,
    categories,
    subcategories,
  ) {
    try {
      const items = fs.readdirSync(categoryPath, { withFileTypes: true });

      const commandFiles = items
        .filter((item) => item.isFile() && item.name.endsWith(".js"))
        .map((item) => item.name);

      for (const file of commandFiles) {
        await this._loadCommand(
          path.join(categoryPath, file),
          categoryName,
          commands,
          categories,
        );
      }

      const subdirs = items
        .filter((item) => item.isDirectory())
        .map((item) => item.name);

      if (subdirs.length > 0) {
        if (!subcategories.has(categoryName)) {
          subcategories.set(categoryName, new Map());
        }

        const categorySubcats = subcategories.get(categoryName);

        for (const subdir of subdirs) {
          const subdirPath = path.join(categoryPath, subdir);
          const subcategoryCommands = [];

          const subCommandFiles = fs
            .readdirSync(subdirPath, { withFileTypes: true })
            .filter((item) => item.isFile() && item.name.endsWith(".js"))
            .map((item) => item.name);

          for (const file of subCommandFiles) {
            const command = await this._loadCommand(
              path.join(subdirPath, file),
              categoryName,
              commands,
              categories,
            );
            if (command) {
              subcategoryCommands.push(command);
            }
          }

          if (subcategoryCommands.length > 0) {
            categorySubcats.set(subdir, subcategoryCommands);
          }
        }
      }
    } catch (error) {
      logger.error(
        "HelpCommand",
        `Error scanning category directory ${categoryName}:`,
        error,
      );
    }
  }

  async _loadCommand(filePath, categoryName, commands, categories) {
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const { default: CommandClass } = await import(fileUrl);

      if (!CommandClass || typeof CommandClass !== "object") {
        return null;
      }

      const command = {
        ...CommandClass,
        category: categoryName,
      };

      commands.set(command.name, command);

      if (command.aliases && Array.isArray(command.aliases)) {
        for (const alias of command.aliases) {
          commands.set(alias, command);
        }
      }

      const categoryCommands = categories.get(categoryName);
      if (categoryCommands && !categoryCommands.find((cmd) => cmd.name === command.name)) {
        categoryCommands.push(command);
      }

      return command;
    } catch (error) {
      logger.error(
        "HelpCommand",
        `Error loading command from ${filePath}:`,
        error,
      );
      return null;
    }
  }

  _getThumbnail() {
    return (
      config.assets?.helpThumbnail ||
      config.assets?.defaultThumbnail ||
      "https://raw.githubusercontent.com/AstrixCode/Astrix/main/thumbnail.png"
    );
  }

  async execute({ client, message, args }) {
    try {
      const { commands, categories, subcategories } =
        await this._scanCommandDirectories();

      if (args.length > 0) {
        const commandName = args[0].toLowerCase();
        const command = commands.get(commandName);

        if (command) {
          return await this._sendCommandHelp(
            message,
            command,
            "message",
            client,
            commands,
            categories,
            subcategories,
          );
        } else {
          return message.reply({
            components: [
              this._createErrorContainer(`Command \`${commandName}\` not found. Use \`.help\` to view all commands.`),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
        }
      }

      if (categories.size === 0) {
        return message.reply({
          components: [this._createErrorContainer("No commands available.")],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const helpMessage = await message.reply({
        components: [
          this._createMainContainer(commands, categories, subcategories, client),
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      this._setupCollector(
        helpMessage,
        message.author.id,
        client,
        commands,
        categories,
        subcategories,
      );
    } catch (error) {
      client.logger?.error(
        "HelpCommand",
        `Error in prefix command: ${error.message}`,
        error,
      );
      await message
        .reply({
          components: [
            this._createErrorContainer("An error occurred while loading help menu."),
          ],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  }

  async slashExecute({ client, interaction }) {
    try {
      const { commands, categories, subcategories } =
        await this._scanCommandDirectories();
      const commandName = interaction.options.getString("command");

      if (commandName) {
        const command = commands.get(commandName.toLowerCase());

        if (command) {
          return await this._sendCommandHelp(
            interaction,
            command,
            "interaction",
            client,
            commands,
            categories,
            subcategories,
          );
        } else {
          return interaction.reply({
            components: [
              this._createErrorContainer(`Command \`${commandName}\` not found.`),
            ],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true,
          });
        }
      }

      if (categories.size === 0) {
        return interaction.reply({
          components: [this._createErrorContainer("No commands available.")],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true,
        });
      }

      const helpMessage = await interaction.reply({
        components: [
          this._createMainContainer(commands, categories, subcategories, client),
        ],
        flags: MessageFlags.IsComponentsV2,
        fetchReply: true,
      });

      this._setupCollector(
        helpMessage,
        interaction.user.id,
        client,
        commands,
        categories,
        subcategories,
      );
    } catch (error) {
      client.logger?.error(
        "HelpCommand",
        `Error in slash command: ${error.message}`,
        error,
      );
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({
            components: [
              this._createErrorContainer("An error occurred while loading help."),
            ],
          });
        } else {
          await interaction.reply({
            components: [
              this._createErrorContainer("An error occurred while loading help."),
            ],
            ephemeral: true,
          });
        }
      } catch (e) {
        logger.error("HelpCommand", "Failed to send error response:", e);
      }
    }
  }

  async autocomplete({ interaction }) {
    try {
      const { commands } = await this._scanCommandDirectories();
      const focusedValue = interaction.options.getFocused();

      const uniqueCommands = new Set();
      for (const [name, command] of commands) {
        if (command.name === name) {
          uniqueCommands.add(name);
        }
      }

      const choices = Array.from(uniqueCommands)
        .filter((name) =>
          name.toLowerCase().includes(focusedValue.toLowerCase()),
        )
        .slice(0, 25)
        .map((name) => ({ name, value: name }));

      await interaction.respond(choices);
    } catch (error) {
      await interaction.respond([]).catch(() => {});
    }
  }

  _createMainContainer(commands, categories, subcategories, client) {
    try {
      const categoryArray = Array.from(categories.keys());
      const uniqueCommands = Array.from(commands.values()).filter(
        (cmd, index, arr) =>
          arr.findIndex((c) => c.name === cmd.name) === index,
      );

      const prefix = config.prefix || ".";
      const ping = client?.ws?.ping && client.ws.ping > 0 ? client.ws.ping : 45;

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Astrix — Command Headquarters\n` +
          `Select a category from the dropdown menu to explore commands.\n` +
          `• Prefix: \`${prefix}\` • Commands: \`${uniqueCommands.length}\` • Latency: \`${ping}ms\``
        ),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      let content = "";
      categoryArray.forEach((category) => {
        const meta = CATEGORY_META[category] || {
          name: this._capitalize(category),
          emoji: "📁",
          description: "Explore commands in this module",
        };
        content += `${meta.emoji} **${meta.name}** — ${meta.description}\n`;
      });

      const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content.trim()))
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(this._getThumbnail()),
        );

      container.addSectionComponents(section);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("help_category_select")
        .setPlaceholder("✨ Choose a command category...")
        .addOptions(
          categoryArray.map((category) => {
            const meta = CATEGORY_META[category] || {
              name: this._capitalize(category),
              emoji: "📁",
              description: "Explore commands",
            };
            const categoryCommands = categories.get(category) || [];
            return {
              label: meta.name,
              value: category,
              emoji: meta.emoji,
              description: `${categoryCommands.length} commands • ${meta.description}`.slice(0, 100),
            };
          }),
        );

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu),
      );

      const inviteUrl = client?.user?.id
        ? `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`
        : "https://discord.com/oauth2/authorize";

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("help_all_commands")
          .setLabel("All Commands")
          .setEmoji("📜")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setLabel("Invite")
          .setEmoji("🔗")
          .setStyle(ButtonStyle.Link)
          .setURL(inviteUrl),
        new ButtonBuilder()
          .setLabel("Support")
          .setEmoji("💬")
          .setStyle(ButtonStyle.Link)
          .setURL("https://discord.gg/zqxWVH3CvG"),
        new ButtonBuilder()
          .setCustomId("help_close")
          .setLabel("Close")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger),
      );

      container.addActionRowComponents(buttonRow);

      return container;
    } catch (error) {
      logger.error("HelpCommand", "Error creating main container:", error);
      return this._createErrorContainer("Unable to load help menu.");
    }
  }

  _createCategoryContainer(category, categories, subcategories) {
    try {
      const commands = categories.get(category) || [];
      const subcats = subcategories.get(category);
      const meta = CATEGORY_META[category] || {
        name: this._capitalize(category),
        emoji: "📁",
        description: "Commands list",
      };

      if (commands.length === 0 && (!subcats || subcats.size === 0)) {
        return this._createErrorContainer(
          `No commands found in category "${meta.name}".`,
        );
      }

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Astrix — ${meta.name}\n` +
          `Browse commands in this module. Use \`.help <command>\` for detailed syntax.\n` +
          `• Total Commands: \`${commands.length}\``
        ),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      let content = "";
      const directCommands = commands.filter((cmd) => {
        if (!subcats) return true;
        for (const [, subcatCommands] of subcats) {
          if (subcatCommands.find((subcmd) => subcmd.name === cmd.name)) {
            return false;
          }
        }
        return true;
      });

      if (directCommands.length > 0) {
        directCommands.forEach((cmd) => {
          content += `• \`.${cmd.name}\` — ${cmd.description || "No description provided"}\n`;
        });
      }

      if (subcats && subcats.size > 0) {
        for (const [subcatName, subcatCommands] of subcats.entries()) {
          content += `\n**📂 ${this._capitalize(subcatName)}**\n`;
          const cmdList = subcatCommands.map((c) => `\`.${c.name}\``).join(" • ");
          content += `${cmdList}\n`;
        }
      }

      const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content.trim().slice(0, 4000)))
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(this._getThumbnail()),
        );

      container.addSectionComponents(section);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      const allCategoryCommands = [...commands];
      if (allCategoryCommands.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`help_command_select_${category}`)
          .setPlaceholder("🔍 Select a command for full details...")
          .addOptions(
            allCategoryCommands.slice(0, 25).map((cmd) => ({
              label: cmd.name,
              emoji: meta.emoji,
              value: cmd.name,
              description: (cmd.description || "No description").slice(0, 100),
            })),
          );

        container.addActionRowComponents(
          new ActionRowBuilder().addComponents(selectMenu),
        );
      }

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("help_back_main")
          .setLabel("Back to Categories")
          .setEmoji("◀️")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("help_close")
          .setLabel("Close")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger),
      );

      container.addActionRowComponents(buttonRow);

      return container;
    } catch (error) {
      logger.error("HelpCommand", "Error creating category container:", error);
      return this._createErrorContainer("Unable to load category commands.");
    }
  }

  _createAllCommandsContainer(commands, categories) {
    try {
      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Astrix — All Commands Directory\n` +
          `A quick index of all bot commands organized by category.\n` +
          `• Total Commands: \`${commands.size}\``
        ),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      let content = "";
      for (const [category, cmdList] of categories.entries()) {
        const meta = CATEGORY_META[category] || {
          name: this._capitalize(category),
          emoji: "📁",
        };
        const uniqueNames = Array.from(new Set(cmdList.map((c) => `\`${c.name}\``))).join(", ");
        content += `${meta.emoji} **${meta.name}** (${cmdList.length})\n${uniqueNames}\n\n`;
      }

      const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content.trim().slice(0, 4000)))
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(this._getThumbnail()),
        );

      container.addSectionComponents(section);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("help_back_main")
          .setLabel("Back to Categories")
          .setEmoji("◀️")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("help_close")
          .setLabel("Close")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger),
      );

      container.addActionRowComponents(buttonRow);
      return container;
    } catch (error) {
      return this._createErrorContainer("Unable to list all commands.");
    }
  }

  _createCommandContainer(command, category) {
    try {
      if (!command) return this._createErrorContainer("Command not found.");

      const container = new ContainerBuilder();
      const meta = CATEGORY_META[category] || {
        name: this._capitalize(category || "general"),
        emoji: "⚡",
      };

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${meta.emoji} Command — .${command.name}\n` +
          `Module: **${meta.name}**`
        ),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      let content = `**Description:**\n${command.description || "No description provided."}\n\n`;
      content += `**Usage:**\n\`${config.prefix || "."}${command.usage || command.name}\`\n\n`;

      if (command.aliases && command.aliases.length > 0) {
        content += `**Aliases:** ${command.aliases.map((a) => `\`${a}\``).join(", ")}\n`;
      }

      content += `**Cooldown:** \`${command.cooldown || 3}s\`\n`;
      content += `**Slash Support:** \`${command.enabledSlash ? "Yes" : "No"}\`\n`;

      if (command.examples && command.examples.length > 0) {
        content += `\n**Examples:**\n${command.examples.map((ex) => `• \`${config.prefix || "."}${ex}\``).join("\n")}\n`;
      }

      const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content.trim()))
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(this._getThumbnail()),
        );

      container.addSectionComponents(section);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(category ? `help_back_category_${category}` : "help_back_main")
          .setLabel(`Back to ${meta.name}`)
          .setEmoji("◀️")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("help_back_main")
          .setLabel("Main Menu")
          .setEmoji("🏠")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("help_close")
          .setLabel("Close")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger),
      );

      container.addActionRowComponents(buttonRow);
      return container;
    } catch (error) {
      logger.error("HelpCommand", "Error creating command container:", error);
      return this._createErrorContainer("Unable to load command details.");
    }
  }

  _createErrorContainer(message) {
    try {
      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${emoji.get("cross") || "❌"} **Astrix Error**`),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      const content = `**Issue:** ${message}\n*Use \`.help\` to view available commands.*`;

      const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(this._getThumbnail()),
        );

      container.addSectionComponents(section);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      return container;
    } catch (error) {
      const fallback = new ContainerBuilder();
      fallback.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`❌ **Error**\n${message}`),
      );
      return fallback;
    }
  }

  async _sendCommandHelp(
    messageOrInteraction,
    command,
    type,
    client,
    commands,
    categories,
    subcategories,
  ) {
    try {
      const container = this._createCommandContainer(command, command.category);

      if (type === "message") {
        const helpMessage = await messageOrInteraction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
        this._setupCollector(
          helpMessage,
          messageOrInteraction.author.id,
          client,
          commands,
          categories,
          subcategories,
        );
      } else {
        const helpMessage = await messageOrInteraction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          fetchReply: true,
        });
        this._setupCollector(
          helpMessage,
          messageOrInteraction.user.id,
          client,
          commands,
          categories,
          subcategories,
        );
      }
    } catch (error) {
      logger.error("HelpCommand", "Error sending command help:", error);
    }
  }

  _setupCollector(
    message,
    userId,
    client,
    commands,
    categories,
    subcategories,
  ) {
    try {
      const filter = (i) => i.user.id === userId;
      const collector = message.createMessageComponentCollector({
        filter,
        time: 300_000,
      });

      collector.on("collect", async (interaction) => {
        try {
          await interaction.deferUpdate();

          if (interaction.customId === "help_close") {
            await interaction.deleteReply().catch(() => {});
            collector.stop();
            return;
          }

          if (interaction.customId === "help_back_main") {
            await interaction.editReply({
              components: [
                this._createMainContainer(commands, categories, subcategories, client),
              ],
            });
            return;
          }

          if (interaction.customId === "help_all_commands") {
            await interaction.editReply({
              components: [
                this._createAllCommandsContainer(commands, categories),
              ],
            });
            return;
          }

          if (interaction.customId === "help_category_select") {
            const category = interaction.values[0];
            await interaction.editReply({
              components: [
                this._createCategoryContainer(
                  category,
                  categories,
                  subcategories,
                ),
              ],
            });
            return;
          }

          if (interaction.customId.startsWith("help_command_select_")) {
            const category = interaction.customId.replace(
              "help_command_select_",
              "",
            );
            const commandName = interaction.values[0];
            const command = commands.get(commandName);

            if (command) {
              await interaction.editReply({
                components: [this._createCommandContainer(command, category)],
              });
            }
            return;
          }

          if (interaction.customId.startsWith("help_back_category_")) {
            const category = interaction.customId.replace(
              "help_back_category_",
              "",
            );
            await interaction.editReply({
              components: [
                this._createCategoryContainer(
                  category,
                  categories,
                  subcategories,
                ),
              ],
            });
            return;
          }
        } catch (error) {
          client?.logger?.error(
            "HelpCommand",
            `Error in collector: ${error.message}`,
            error,
          );
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "limit" || reason === "messageDelete") return;

        try {
          const currentMessage = await this._fetchMessage(message).catch(
            () => null,
          );

          if (!currentMessage?.components?.length) return;

          const disabledComponents = this._processComponents(currentMessage.components);
          await currentMessage.edit({
            components: disabledComponents,
            flags: MessageFlags.IsComponentsV2,
          });
        } catch (error) {}
      });
    } catch (error) {
      logger.error("HelpCommand", "Error setting up collector:", error);
    }
  }

  _processComponents(components) {
    return components.map((component) => {
      if (component.type === ComponentType.ActionRow) {
        return {
          ...component.toJSON(),
          components: component.components.map((subComponent) => ({
            ...subComponent.toJSON(),
            disabled: true,
          })),
        };
      }

      if (component.type === ComponentType.Container) {
        return {
          ...component.toJSON(),
          components: this._processComponents(component.components),
        };
      }

      if (component.type === ComponentType.Section) {
        return {
          ...component.toJSON(),
          components: this._processComponents(component.components),
        };
      }

      return component.toJSON();
    });
  }

  async _fetchMessage(messageOrInteraction) {
    if (messageOrInteraction.fetchReply) {
      return await messageOrInteraction.fetchReply();
    } else if (messageOrInteraction.fetch) {
      return await messageOrInteraction.fetch();
    } else {
      return messageOrInteraction;
    }
  }

  _capitalize(str) {
    try {
      if (!str || typeof str !== "string") return "Unknown";
      return str.charAt(0).toUpperCase() + str.slice(1);
    } catch (error) {
      return "Unknown";
    }
  }
}

export default new HelpCommand();
