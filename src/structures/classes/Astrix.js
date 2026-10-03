import { REST } from '@discordjs/rest';
import { ClusterClient, getInfo } from 'discord-hybrid-sharding';
import {
	Client,
	GatewayIntentBits,
	Collection,
	Partials,
	Options,
} from 'discord.js';

import { config } from '#config/config';
import { db } from '#database/DatabaseManager';
import { CommandHandler } from '#handlers/CommandHandler';
import { EventLoader } from '#handlers/EventLoader';
import { MusicManager } from '#managers/MusicManager';
import { logger } from '#utils/logger';

let shardInfo = null;
try {
	shardInfo = getInfo();
} catch (error) {
	shardInfo = null;
	console.error(`Error while getting shard info: ${error}`);
}

export class Astrix extends Client {
	constructor() {
		const clientOptions = {
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.GuildMessageReactions,
				GatewayIntentBits.MessageContent,
			],
			partials: [
				Partials.Channel,
				Partials.GuildMember,
				Partials.Message,
				Partials.User,
			],
			makeCache: Options.cacheWithLimits({
				MessageManager: 100,
				PresenceManager: 0,
				UserManager: 100,
			}),
			failIfNotExists: false,
			allowedMentions: { parse: ['users', 'roles'], repliedUser: false },
		};

		if (shardInfo) {
			clientOptions.shards = shardInfo.SHARD_LIST;
			clientOptions.shardCount = shardInfo.TOTAL_SHARDS;
		}

		super(clientOptions);

		this.cluster = shardInfo ? new ClusterClient(this) : null;
		this.commands = new Collection();
		this.logger = logger;
		this.config = config;
		this.db = db;
		this.music = new MusicManager(this);
		this.lavalink = this.music.lavalink;

		this.commandHandler = new CommandHandler(this);
		this.eventHandler = new EventLoader(this);

		this.startTime = Date.now();
		this.rest = new REST({ version: '10' }).setToken(config.token);
	}

	async init() {
		console.log(`\x1b[36m
   █████╗ ███████╗████████╗██████╗ ██╗██╗  ██╗
  ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██║╚██╗██╔╝
  ███████║███████╗   ██║   ██████╔╝██║ ╚███╔╝ 
  ██╔══██║╚════██║   ██║   ██╔══██╗██║ ██╔██╗ 
  ██║  ██║███████║   ██║   ██║  ██║██║██╔╝ ██╗
  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝
         ⚡ Astrix Discord Bot • Online ⚡
\x1b[0m`);

		this.logger.info('Astrix', `Initializing bot system...`);
		try {
			await this.eventHandler.loadAllEvents();
			await this.commandHandler.loadCommands();
			await this.login(config.token);

			this.logger.success(
				'Astrix',
				`Astrix Bot is successfully online & ready!`,
			);
		} catch (error) {
			this.logger.error(
				'Astrix',
				'Failed to initialize Astrix cluster:',
				error,
			);
			throw error;
		}
	}

	async cleanup() {
		this.logger.warn('Astrix', `Starting cleanup for Astrix...`);
		try {
			await this.db.closeAll();
			this.destroy();
			this.logger.success(
				'Astrix',
				'Cleanup completed successfully.',
			);
		} catch (error) {
			this.logger.error(
				'Astrix',
				'An error occurred during cleanup:',
				error,
			);
		}
	}

	get uptime() {
		return Date.now() - this.startTime;
	}
}

export const Yukihana = Astrix;
