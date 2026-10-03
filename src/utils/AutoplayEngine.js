import { logger } from "#utils/logger";

class AutoplayEngine {
  constructor() {
    this.history = new Map();
  }

  recordHistory(guildId, track) {
    if (!guildId || !track) return;
    if (!this.history.has(guildId)) {
      this.history.set(guildId, new Set());
    }
    const set = this.history.get(guildId);
    const id = this._trackIdentifier(track);
    set.add(id);
    if (set.size > 100) {
      const first = set.values().next().value;
      set.delete(first);
    }
  }

  hasPlayed(guildId, track) {
    if (!guildId || !track) return false;
    const set = this.history.get(guildId);
    if (!set) return false;
    return set.has(this._trackIdentifier(track));
  }

  _cleanTitle(title) {
    if (!title) return "";
    return title
      .replace(/[\(\[\{].*?(official|video|audio|lyrics?|visualiser|remix|feat|ft\.).*?[\)\]\}]/gi, "")
      .replace(/#\w+/g, "")
      .replace(/[\-–—\|].*$/, "")
      .trim();
  }

  _trackIdentifier(track) {
    const title = track.info?.title?.toLowerCase() || "";
    const author = track.info?.author?.toLowerCase() || "";
    return `${author}:${title}`.replace(/\s+/g, " ").trim();
  }

  async getRecommendations(client, player, sourceTrack, limit = 5) {
    try {
      const title = this._cleanTitle(sourceTrack?.info?.title || "");
      const author = sourceTrack?.info?.author || "";
      const guildId = player.guildId;

      logger.info("AutoplayEngine", `Generating taste recommendations for "${title}" by ${author}`);

      const queries = [
        `spsearch:${author} ${title}`,
        `sprec:seed_tracks=${sourceTrack?.info?.identifier}`,
        `ytsearch:${author} mix`,
        `ytsearch:${title} similar songs`
      ];

      const candidates = [];

      for (const query of queries) {
        try {
          const res = await player.search(query, player.get("autoplaySetBy") || client.user.id);
          if (res?.tracks?.length) {
            for (const t of res.tracks) {
              if (
                t.info.identifier !== sourceTrack?.info?.identifier &&
                !this.hasPlayed(guildId, t) &&
                !player.queue.tracks.some(q => q.info.identifier === t.info.identifier)
              ) {
                candidates.push(t);
              }
            }
          }
        } catch (_) {}

        if (candidates.length >= limit) break;
      }

      if (candidates.length === 0 && author) {
        try {
          const res = await player.search(`ytsearch:${author} popular songs`, player.get("autoplaySetBy") || client.user.id);
          if (res?.tracks?.length) {
            for (const t of res.tracks) {
              if (
                t.info.identifier !== sourceTrack?.info?.identifier &&
                !this.hasPlayed(guildId, t)
              ) {
                candidates.push(t);
              }
            }
          }
        } catch (_) {}
      }

      return candidates.slice(0, limit);
    } catch (err) {
      logger.error("AutoplayEngine", "Failed to generate recommendations:", err);
      return [];
    }
  }

  async playNextSimilar(client, player, sourceTrack) {
    try {
      const recs = await this.getRecommendations(client, player, sourceTrack, 3);
      if (!recs || recs.length === 0) {
        logger.warn("AutoplayEngine", `No recommendations found for guild ${player.guildId}`);
        return null;
      }

      const nextTrack = recs[0];
      this.recordHistory(player.guildId, nextTrack);
      await player.queue.add(nextTrack);

      if (!player.playing && !player.paused) {
        await player.play();
      }

      logger.success("AutoplayEngine", `Autoplay queued: "${nextTrack.info.title}" by ${nextTrack.info.author}`);
      return nextTrack;
    } catch (err) {
      logger.error("AutoplayEngine", "Error playing next similar track:", err);
      return null;
    }
  }
}

export const autoplayEngine = new AutoplayEngine();
