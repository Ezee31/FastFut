package dev.fastfut.dedsafio;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.GameMode;
import org.bukkit.GameRule;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.World;
import org.bukkit.attribute.Attribute;
import org.bukkit.attribute.AttributeInstance;
import org.bukkit.boss.BarColor;
import org.bukkit.boss.BarStyle;
import org.bukkit.boss.KeyedBossBar;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.MagmaCube;
import org.bukkit.entity.Phantom;
import org.bukkit.entity.Player;
import org.bukkit.entity.Ravager;
import org.bukkit.entity.Warden;
import org.bukkit.entity.Zombie;
import org.bukkit.event.entity.CreatureSpawnEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;
import org.bukkit.scheduler.BukkitRunnable;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

final class Game {
    private static final String[] CLUES = {
            "Iceberg: bajo el hielo no hay un tesoro. Hay un nombre que el servidor no dice en voz alta.",
            "Iceberg: Qumara no es el final. Es la puerta.",
            "Iceberg: las cucharas no perdonan. Eligen a quién vuelve.",
            "Iceberg: el rayo no busca al más lento. Busca al que se quedó mirando.",
            "Iceberg: el T-Rex no guarda rencor. Guarda la lista.",
            "Iceberg: cuando el eclipse apague el día, no mires al zombie. Mira quién no corre.",
            "Iceberg: el día 5 el Nether deja de ser un rumor.",
            "Iceberg: hay una grieta en el hielo, al fondo de la sala azul. Nadie la cavó."
    };

    private final DedsafioPlugin plugin;
    private final NamespacedKey trexBarKey;
    private final NamespacedKey qumaraBarKey;
    private int ticks;
    private int gulagGrace;
    private int qumaraGrace;
    private boolean ready;
    private final Map<UUID, Location> deaths = new HashMap<>();
    private final Set<UUID> cinemaPlayers = new HashSet<>();

    Game(DedsafioPlugin plugin) {
        this.plugin = plugin;
        this.trexBarKey = new NamespacedKey(plugin, "trex");
        this.qumaraBarKey = new NamespacedKey(plugin, "qumara");
    }

    void onReady() {
        if (ready) {
            return;
        }
        ready = true;
        State state = plugin.state();
        if (state.gulagActive) {
            state.gulagActive = false;
            removeTagged(plugin.arenas().eventos(), Ravager.class, "dedsafio_trex");
            if (state.gulagFighter != null) {
                State.Record record = state.peek(state.gulagFighter);
                if (record != null && record.status != State.Status.ELIMINADO) {
                    record.status = State.Status.CAIDO;
                }
            }
            state.gulagFighter = null;
            plugin.getLogger().info("El Gulag se canceló al reiniciar. El peleador sigue caído.");
        }
        if (state.juicioActive || state.juicioOpen) {
            state.juicioActive = false;
            state.juicioOpen = false;
            state.juicioQueue.clear();
            state.juicioA = null;
            state.juicioB = null;
            plugin.setPvp(false);
        }
        if (state.qumara == 1) {
            qumaraGrace = 80;
            Warden warden = findWarden();
            if (warden != null) {
                warden.setAI(false);
                warden.setAware(false);
                warden.setRemoveWhenFarAway(false);
                warden.setPersistent(true);
            }
        }
        plugin.refreshSidebar();
        state.save();
    }

    void shutdown() {
        hideBar(trexBarKey);
        hideBar(qumaraBarKey);
    }

    void tick() {
        ticks++;
        if (!ready) {
            return;
        }
        clock();
        eclipse();
        rayo();
        regen();
        fantasmas();
        gulag();
        juicio();
        qumara();
        if (ticks % 20 == 0) {
            plugin.refreshSidebar();
            comfortFallen();
        }
        if (ticks % 600 == 0) {
            plugin.state().save();
        }
    }

    void nuevoDia() {
        State state = plugin.state();
        state.reloj = 0;
        state.day++;
        plugin.all(ChatColor.GOLD + "Día " + ChatColor.YELLOW + state.day + ChatColor.GOLD + " del DEDsafío.");
        if (state.day == 5) {
            plugin.all(ChatColor.RED + "Día 5: el Nether ya no perdona. Los cubos de magma salen a cazar.");
        }
        girar();
        state.save();
    }

    void girar() {
        int roll = ThreadLocalRandom.current().nextInt(1, 11);
        titleAlive(ChatColor.GOLD + "LA RULETA", "");
        soundAlive(Sound.BLOCK_NOTE_BLOCK_BELL, 1f, 1f);
        switch (roll) {
            case 1 -> eclipseStart();
            case 2 -> rayoStart();
            case 3 -> hambre();
            case 4 -> sinRegen();
            case 5 -> suerte();
            case 6 -> fantasmasStart();
            case 7 -> debilidad();
            case 8 -> magma();
            case 9 -> pista();
            default -> prisa();
        }
    }

    void eclipseStart() {
        State state = plugin.state();
        state.eclipse = 3600;
        state.pulso = 0;
        World world = plugin.arenas().overworld();
        if (world != null) {
            world.setTime(18000L);
        }
        effectAlive(new PotionEffect(PotionEffectType.DARKNESS, 160, 0, true, false, true));
        titleAlive("", ChatColor.DARK_PURPLE + "Eclipse");
        plugin.all(ChatColor.DARK_PURPLE + "EL ECLIPSE APAGA EL DÍA. Los que no vean, no se defienden.");
    }

    void rayoStart() {
        State state = plugin.state();
        state.rayo = 800;
        World world = plugin.arenas().overworld();
        if (world != null) {
            world.setStorm(true);
            world.setThundering(true);
            world.setWeatherDuration(20 * 50);
            world.setThunderDuration(20 * 50);
        }
        titleAlive("", ChatColor.YELLOW + "Cae el rayo");
        if (state.bunker) {
            plugin.all(ChatColor.YELLOW + "Tienes 40 segundos para entrar al búnker. Quien se quede fuera, lo alcanza el rayo.");
        } else {
            plugin.all(ChatColor.YELLOW + "No hay búnker. En 40 segundos el rayo busca a quien vea el cielo.");
        }
    }

    void qumaraSummon() {
        if (findWarden() != null || plugin.state().qumara == 1) {
            plugin.all(ChatColor.DARK_PURPLE + "Qumara ya está en la arena.");
            return;
        }
        Location spot = plugin.arenas().qumaraBoss();
        if (spot == null || spot.getWorld() == null) {
            plugin.all(ChatColor.RED + "La arena de Qumara no está lista.");
            return;
        }
        Warden warden = spot.getWorld().spawn(spot, Warden.class, CreatureSpawnEvent.SpawnReason.CUSTOM, entity -> {
            entity.setCustomName(ChatColor.DARK_PURPLE + "Qumara");
            entity.setCustomNameVisible(true);
            entity.setGlowing(true);
            entity.setPersistent(true);
            entity.setRemoveWhenFarAway(false);
            entity.setAI(false);
            entity.setAware(false);
            entity.addScoreboardTag("dedsafio_qumara");
            attribute(entity, Attribute.MAX_HEALTH, 500);
            attribute(entity, Attribute.SCALE, 1.6);
            entity.setHealth(Math.min(500, entity.getMaxHealth()));
        });
        if (warden == null) {
            plugin.all(ChatColor.RED + "Qumara no apareció.");
            return;
        }
        plugin.getLogger().info("QUMARA_OK");
        plugin.state().qumara = 1;
        qumaraGrace = 40;
        titleAlive(ChatColor.DARK_PURPLE + "QUMARA", ChatColor.LIGHT_PURPLE + "No tendrá piedad");
        plugin.all(ChatColor.DARK_PURPLE + "EL PRIMER JEFE HA APARECIDO. Qumara espera en su arena.");
        plugin.all(ChatColor.GOLD + "Usa /jefe para ir a la arena.");
        soundAll(Sound.ENTITY_WARDEN_ROAR, 0.8f, 0.8f);
        plugin.state().save();
    }

    void openJuicio() {
        State state = plugin.state();
        if (state.juicioActive) {
            plugin.all(ChatColor.RED + "Ya hay un Juicio en curso.");
            return;
        }
        state.juicioOpen = true;
        state.juicioQueue.clear();
        plugin.all(ChatColor.GOLD + "El Juicio está abierto. Dos vivos se anotan con /juicio.");
        state.save();
    }

    boolean joinJuicio(Player player) {
        State state = plugin.state();
        State.Record record = state.get(player);
        if (!state.juicioOpen || state.juicioActive) {
            player.sendMessage(ChatColor.GRAY + "El Juicio no está recibiendo gente.");
            return false;
        }
        if (record.status != State.Status.VIVO) {
            player.sendMessage(ChatColor.GRAY + "Solo entra quien sigue en pie.");
            return false;
        }
        if (state.juicioQueue.contains(player.getUniqueId())) {
            player.sendMessage(ChatColor.GRAY + "Ya estás en la fila del Juicio.");
            return false;
        }
        state.juicioQueue.add(player.getUniqueId());
        plugin.all(ChatColor.GOLD + player.getName() + ChatColor.GRAY + " se anotó al Juicio (" + state.juicioQueue.size() + "/2).");
        if (state.juicioQueue.size() >= 2) {
            startJuicio();
        }
        return true;
    }

    boolean enterGulag(Player player) {
        State state = plugin.state();
        State.Record record = state.get(player);
        if (record.status == State.Status.ELIMINADO) {
            player.sendMessage(ChatColor.DARK_RED + "El Gulag ya no te abre. Quedaste eliminado.");
            return false;
        }
        if (record.status != State.Status.CAIDO) {
            player.sendMessage(ChatColor.GRAY + "El Gulag es para quien ya cayó.");
            return false;
        }
        if (state.gulagActive && !player.getUniqueId().equals(state.gulagFighter)) {
            player.sendMessage(ChatColor.RED + "Hay alguien dentro del Gulag. Espera tu turno.");
            return false;
        }
        if (state.gulagActive) {
            player.sendMessage(ChatColor.RED + "Ya estás en el Gulag.");
            return false;
        }
        Location spot = plugin.arenas().gulagFight();
        Location rexSpot = plugin.arenas().rex();
        if (spot == null || rexSpot == null || spot.getWorld() == null) {
            player.sendMessage(ChatColor.RED + "La arena del Gulag no está lista.");
            return false;
        }
        cinemaPlayers.remove(player.getUniqueId());
        state.nextCinema(player.getUniqueId());
        state.gulagActive = true;
        state.gulagFighter = player.getUniqueId();
        state.gulagTime = 1400;
        gulagGrace = 20;
        player.getInventory().clear();
        player.setGameMode(GameMode.ADVENTURE);
        player.teleport(spot);
        player.setFallDistance(0);
        plugin.items().equipGulag(player);
        removeTagged(spot.getWorld(), Ravager.class, "dedsafio_trex");
        spot.getWorld().spawn(rexSpot, Ravager.class, CreatureSpawnEvent.SpawnReason.CUSTOM, entity -> {
            entity.setCustomName(ChatColor.DARK_RED + "Tiranosaurio Rex");
            entity.setCustomNameVisible(true);
            entity.setGlowing(true);
            entity.setPersistent(true);
            entity.setRemoveWhenFarAway(false);
            entity.setCanJoinRaid(false);
            entity.addScoreboardTag("dedsafio_trex");
            attribute(entity, Attribute.MAX_HEALTH, 180);
            attribute(entity, Attribute.SCALE, 2.1);
            attribute(entity, Attribute.ATTACK_DAMAGE, 10);
            attribute(entity, Attribute.MOVEMENT_SPEED, 0.28);
            entity.setHealth(Math.min(180, entity.getMaxHealth()));
        });
        player.sendTitle(ChatColor.DARK_RED + "GULAG", ChatColor.GOLD + "Mata al T-Rex", 5, 40, 10);
        plugin.all(ChatColor.RED + player.getName() + ChatColor.GRAY + " entra al Gulag contra el Tiranosaurio Rex.");
        soundAll(Sound.ENTITY_RAVAGER_ROAR, 1f, 0.7f);
        state.save();
        return true;
    }

    void fall(Player player) {
        State.Record record = plugin.state().get(player);
        record.status = State.Status.CAIDO;
        int token = plugin.state().nextCinema(player.getUniqueId());
        plugin.all(ChatColor.DARK_RED + "☠ " + ChatColor.RED + player.getName() + ChatColor.GRAY + " cayó. Te vemos en el GULAG.");
        plugin.all(ChatColor.GOLD + "Sobrevivientes: " + ChatColor.WHITE + plugin.state().count(State.Status.VIVO));
        player.sendMessage(ChatColor.RED + "Cuchara de un compañero, o /gulag");
        playCinema(player.getUniqueId(), token, false);
        plugin.state().save();
    }

    void eliminate(Player player) {
        State state = plugin.state();
        state.gulagActive = false;
        state.gulagFighter = null;
        state.gulagTime = -1;
        hideBar(trexBarKey);
        removeTagged(plugin.arenas().eventos(), Ravager.class, "dedsafio_trex");
        State.Record record = state.get(player);
        record.status = State.Status.ELIMINADO;
        int token = state.nextCinema(player.getUniqueId());
        plugin.all(ChatColor.DARK_RED + player.getName() + ChatColor.RED
                + " queda ELIMINADO DEFINITIVAMENTE. El Tiranosaurio Rex puso fin a su camino en el GULAG.");
        plugin.all(ChatColor.GOLD + "Sobrevivientes: " + ChatColor.WHITE + state.count(State.Status.VIVO));
        playCinema(player.getUniqueId(), token, true);
        state.save();
    }

    void revive(Player target, Player source) {
        State state = plugin.state();
        if (state.isGulagFighter(target.getUniqueId())) {
            state.gulagActive = false;
            state.gulagFighter = null;
            hideBar(trexBarKey);
            removeTagged(plugin.arenas().eventos(), Ravager.class, "dedsafio_trex");
        }
        cinemaPlayers.remove(target.getUniqueId());
        state.nextCinema(target.getUniqueId());
        State.Record record = state.get(target);
        record.status = State.Status.VIVO;
        target.setGameMode(GameMode.SURVIVAL);
        target.teleport(source.getLocation());
        target.setFallDistance(0);
        target.setFoodLevel(20);
        target.setSaturation(20f);
        target.addPotionEffect(new PotionEffect(PotionEffectType.RESISTANCE, 200, 4, true, false, true));
        target.addPotionEffect(new PotionEffect(PotionEffectType.REGENERATION, 160, 1, true, false, true));
        target.addPotionEffect(new PotionEffect(PotionEffectType.SATURATION, 40, 20, true, false, true));
        target.sendTitle(ChatColor.GREEN + "REVIVIDO", "", 5, 30, 10);
        target.playSound(target.getLocation(), Sound.ITEM_TOTEM_USE, 1f, 1f);
        target.getWorld().spawnParticle(Particle.TOTEM_OF_UNDYING, target.getLocation().add(0, 1, 0), 40, 0.4, 0.6, 0.4, 0.2);
        plugin.all(ChatColor.GOLD + source.getName() + ChatColor.GRAY + " revivió a " + ChatColor.GREEN + target.getName()
                + ChatColor.GRAY + " con una cuchara.");
        plugin.refreshSidebar();
        state.save();
    }

    Player nearestFallen(Player source) {
        State.Record self = plugin.state().get(source);
        Player best = null;
        int bestRank = -1;
        double bestDistance = Double.MAX_VALUE;
        for (Player other : Bukkit.getOnlinePlayers()) {
            if (other.equals(source)) {
                continue;
            }
            State.Record record = plugin.state().peek(other.getUniqueId());
            if (record == null || record.status != State.Status.CAIDO) {
                continue;
            }
            boolean sameTeam = self.team != null && self.team.equals(record.team);
            boolean sameWorld = source.getWorld().equals(other.getWorld());
            int rank = (sameTeam ? 2 : 0) + (sameWorld ? 1 : 0);
            double distance = sameWorld ? source.getLocation().distanceSquared(other.getLocation()) : Double.MAX_VALUE;
            if (rank > bestRank || (rank == bestRank && distance < bestDistance)) {
                best = other;
                bestRank = rank;
                bestDistance = distance;
            }
        }
        return best;
    }

    void go(Player player, Location location, String denied) {
        State.Record record = plugin.state().get(player);
        if (record.status != State.Status.VIVO && !player.hasPermission("dedsafio.admin")) {
            player.sendMessage(ChatColor.GRAY + denied);
            return;
        }
        if (location == null) {
            player.sendMessage(ChatColor.RED + "Esa sala todavía no está construida.");
            return;
        }
        player.teleport(location);
        player.setFallDistance(0);
    }

    void perdonar() {
        State state = plugin.state();
        abortGulagSilent();
        closeJuicioSilent();
        state.reviveAll();
        Location camp = plugin.arenas().campStand();
        for (Player player : Bukkit.getOnlinePlayers()) {
            cinemaPlayers.remove(player.getUniqueId());
            state.nextCinema(player.getUniqueId());
            player.setGameMode(GameMode.SURVIVAL);
            player.setFoodLevel(20);
            if (camp != null) {
                player.teleport(camp);
                player.setFallDistance(0);
            }
            applyTeam(player);
        }
        plugin.all(ChatColor.GREEN + "Todos vuelven a la partida.");
        plugin.refreshSidebar();
        state.save();
    }

    void calmar() {
        State state = plugin.state();
        state.qumara = 0;
        state.eclipse = -1;
        state.rayo = -1;
        state.sinRegen = -1;
        state.fantasmas = -1;
        state.pulso = 0;
        state.day = 1;
        state.reloj = 0;
        state.pista = 0;
        abortGulagSilent();
        closeJuicioSilent();
        World eventos = plugin.arenas().eventos();
        removeTagged(eventos, Warden.class, "dedsafio_qumara");
        removeTagged(eventos, Ravager.class, "dedsafio_trex");
        removeTagged(null, Zombie.class, "dedsafio_sombra");
        removeTagged(null, Phantom.class, "dedsafio_phantom");
        removeTagged(null, MagmaCube.class, "dedsafio_magma");
        hideBar(trexBarKey);
        hideBar(qumaraBarKey);
        for (World world : Bukkit.getWorlds()) {
            world.setGameRule(GameRule.NATURAL_REGENERATION, true);
            world.setStorm(false);
            world.setThundering(false);
            if (world.getEnvironment() == World.Environment.NORMAL) {
                world.setTime(1000L);
            }
        }
        plugin.setPvp(false);
        plugin.all(ChatColor.GREEN + "Calma. Día 1, eventos apagados. Quien estaba eliminado sigue eliminado.");
        plugin.getLogger().info("CALMA_OK");
        state.save();
    }

    void abortGulag() {
        if (!plugin.state().gulagActive) {
            return;
        }
        UUID fighter = plugin.state().gulagFighter;
        abortGulagSilent();
        Player player = fighter == null ? null : Bukkit.getPlayer(fighter);
        if (player != null && plugin.state().get(player).status == State.Status.CAIDO) {
            Location lobby = plugin.arenas().lobby();
            player.setGameMode(GameMode.ADVENTURE);
            if (lobby != null) {
                player.teleport(lobby);
            }
        }
        plugin.all(ChatColor.YELLOW + "El Gulag se canceló. El peleador vuelve a la sala de espera.");
        plugin.state().save();
    }

    void onQuit(Player player) {
        State state = plugin.state();
        if (state.isGulagFighter(player.getUniqueId())) {
            abortGulag();
            return;
        }
        if (!state.isJuicioFighter(player.getUniqueId())) {
            return;
        }
        Player other = otherFighter(player.getUniqueId());
        state.get(player).status = State.Status.CAIDO;
        state.nextCinema(player.getUniqueId());
        closeJuicioSilent();
        if (other != null && other.isOnline()) {
            sendWinner(other);
        }
        plugin.all(ChatColor.YELLOW + player.getName() + " abandonó el Juicio. El rival gana.");
        state.save();
    }

    void rememberDeath(Player player) {
        deaths.put(player.getUniqueId(), player.getLocation().clone());
    }

    Location takeDeath(UUID id) {
        return deaths.remove(id);
    }

    boolean isInCinema(UUID id) {
        return cinemaPlayers.contains(id);
    }

    void guard(Player player) {
        State.Record record = plugin.state().peek(player.getUniqueId());
        if (record == null || record.status != State.Status.CAIDO || plugin.state().isGulagFighter(player.getUniqueId())) {
            return;
        }
        if (isInCinema(player.getUniqueId()) || player.getGameMode() == GameMode.SPECTATOR) {
            return;
        }
        Location lobby = plugin.arenas().lobby();
        if (lobby == null || lobby.getWorld() == null) {
            return;
        }
        int floor = plugin.state().floorY;
        Location at = player.getLocation();
        if (!at.getWorld().equals(lobby.getWorld()) || outside(at, -16, 16, floor - 2, floor + 8, -52, -32)) {
            player.teleport(lobby);
            player.setFallDistance(0);
            player.setGameMode(GameMode.ADVENTURE);
        }
    }

    void afterRespawn(Player player) {
        State.Record record = plugin.state().get(player);
        if (record.status == State.Status.ELIMINADO) {
            player.setGameMode(GameMode.SPECTATOR);
            return;
        }
        if (record.status == State.Status.CAIDO && !plugin.state().isGulagFighter(player.getUniqueId())) {
            player.setGameMode(GameMode.SPECTATOR);
        }
    }

    void applyTeam(Player player) {
        State.Record record = plugin.state().get(player);
        var board = Bukkit.getScoreboardManager().getMainScoreboard();
        for (String id : DedsafioPlugin.TEAM_IDS) {
            var team = board.getTeam(id);
            if (team != null) {
                team.removeEntry(player.getName());
            }
        }
        if (record.team == null) {
            player.setPlayerListName(player.getName());
            return;
        }
        var team = board.getTeam(record.team);
        if (team != null) {
            team.addEntry(player.getName());
        }
        player.setPlayerListName(plugin.teamColor(record.team) + player.getName());
    }

    boolean chooseTeam(Player player, String team) {
        if (!DedsafioPlugin.TEAM_IDS.contains(team)) {
            return false;
        }
        State.Record record = plugin.state().get(player);
        if (record.status == State.Status.ELIMINADO) {
            player.sendMessage(ChatColor.DARK_RED + "Un eliminado ya no elige equipo.");
            return true;
        }
        record.team = team;
        applyTeam(player);
        player.sendMessage(plugin.teamColor(team) + "Equipo " + team + ".");
        plugin.state().save();
        return true;
    }

    void onBossDeath(LivingEntity entity) {
        if (entity.getScoreboardTags().contains("dedsafio_qumara") && plugin.state().qumara == 1) {
            qumaraDown(entity.getLocation());
        }
        if (entity.getScoreboardTags().contains("dedsafio_trex") && plugin.state().gulagActive) {
            gulagWin();
        }
        if (entity.getType() == org.bukkit.entity.EntityType.WITHER || entity.getType() == org.bukkit.entity.EntityType.ENDER_DRAGON) {
            Player killer = entity.getKiller();
            if (killer != null && plugin.state().get(killer).status == State.Status.VIVO) {
                plugin.items().giveSpoon(killer, 2);
                killer.sendMessage(ChatColor.GOLD + "El jefe soltó dos cucharas.");
                killer.playSound(killer.getLocation(), Sound.ENTITY_PLAYER_LEVELUP, 1f, 1f);
            }
        }
    }

    private void playCinema(UUID id, int token, boolean eliminated) {
        cinemaPlayers.add(id);
        new BukkitRunnable() {
            private int runs;

            @Override
            public void run() {
                if (!plugin.state().cinemaIs(id, token)) {
                    cinemaPlayers.remove(id);
                    cancel();
                    return;
                }
                Player player = Bukkit.getPlayer(id);
                if (player == null || !player.isOnline()) {
                    return;
                }
                if (runs == 0) {
                    player.setGameMode(GameMode.SPECTATOR);
                    if (eliminated) {
                        player.sendTitle(ChatColor.DARK_RED + "ELIMINADO", ChatColor.GRAY + "El T-Rex acabó tu camino", 5, 50, 15);
                        player.playSound(player.getLocation(), Sound.ENTITY_WITHER_SPAWN, 0.7f, 0.8f);
                    } else {
                        player.sendTitle(ChatColor.DARK_RED + "CAÍSTE", ChatColor.GOLD + "Cuchara o Gulag", 5, 50, 10);
                        player.playSound(player.getLocation(), Sound.ENTITY_WITHER_SPAWN, 0.6f, 1f);
                    }
                    player.addPotionEffect(new PotionEffect(PotionEffectType.DARKNESS, 70, 0, true, false, true));
                }
                Location loc = player.getLocation().add(0, 1, 0);
                player.getWorld().spawnParticle(Particle.SOUL, loc, 18, 0.45, 0.7, 0.45, 0.02);
                player.getWorld().spawnParticle(Particle.LARGE_SMOKE, loc, 8, 0.3, 0.4, 0.3, 0.01);
                player.getWorld().spawnParticle(Particle.SCULK_SOUL, loc, 6, 0.2, 0.4, 0.2, 0.01);
                runs++;
                if (runs < 12) {
                    return;
                }
                cancel();
                cinemaPlayers.remove(id);
                if (!plugin.state().cinemaIs(id, token) || !player.isOnline()) {
                    return;
                }
                if (eliminated) {
                    player.setGameMode(GameMode.SPECTATOR);
                    Location watch = plugin.arenas().campSpectator();
                    if (watch != null) {
                        player.teleport(watch);
                    }
                    return;
                }
                if (plugin.state().get(player).status != State.Status.CAIDO || plugin.state().isGulagFighter(id)) {
                    return;
                }
                player.setGameMode(GameMode.ADVENTURE);
                player.setFoodLevel(20);
                player.setSaturation(20f);
                Location lobby = plugin.arenas().lobby();
                if (lobby != null) {
                    player.teleport(lobby);
                    player.setFallDistance(0);
                }
                player.sendMessage(ChatColor.RED + "Estás en el lobby. /gulag contra el T-Rex, o espera una cuchara.");
            }
        }.runTaskTimer(plugin, 1L, 5L);
    }

    private void clock() {
        if (Bukkit.getOnlinePlayers().isEmpty()) {
            return;
        }
        State state = plugin.state();
        state.reloj++;
        if (state.reloj >= plugin.cycleTicks()) {
            nuevoDia();
        }
    }

    private void eclipse() {
        State state = plugin.state();
        if (state.eclipse < 0) {
            return;
        }
        state.eclipse--;
        state.pulso++;
        if (state.pulso >= 200) {
            state.pulso = 0;
            effectAlive(new PotionEffect(PotionEffectType.DARKNESS, 240, 0, true, false, true));
            List<Player> vivos = playing();
            if (!vivos.isEmpty()) {
                Player pick = vivos.get(ThreadLocalRandom.current().nextInt(vivos.size()));
                World overworld = plugin.arenas().overworld();
                if (overworld != null && pick.getWorld().equals(overworld)) {
                    Location at = pick.getLocation().add(4, 0, 0);
                    pick.getWorld().spawn(at, Zombie.class, CreatureSpawnEvent.SpawnReason.CUSTOM, zombie -> {
                        zombie.setCustomName(ChatColor.DARK_PURPLE + "Sombra");
                        zombie.setCustomNameVisible(true);
                        zombie.setShouldBurnInDay(false);
                        zombie.setPersistent(true);
                        zombie.setRemoveWhenFarAway(false);
                        zombie.addScoreboardTag("dedsafio_sombra");
                        attribute(zombie, Attribute.ATTACK_DAMAGE, 7);
                    });
                }
            }
        }
        if (state.eclipse == 0) {
            state.eclipse = -1;
            state.pulso = 0;
            World world = plugin.arenas().overworld();
            if (world != null) {
                world.setTime(1000L);
            }
            removeTagged(null, Zombie.class, "dedsafio_sombra");
            titleAlive("", ChatColor.YELLOW + "El eclipse termina");
            plugin.all(ChatColor.YELLOW + "Vuelve la luz.");
        }
    }

    private void rayo() {
        State state = plugin.state();
        if (state.rayo < 0) {
            return;
        }
        state.rayo--;
        if (state.rayo > 0) {
            if (ticks % 20 == 0) {
                for (Player player : playing()) {
                    player.sendActionBar(ChatColor.YELLOW + "EL RAYO CAE. Entra al búnker del mundo principal.");
                }
            }
            return;
        }
        state.rayo = -1;
        World overworld = plugin.arenas().overworld();
        if (overworld != null) {
            overworld.setStorm(false);
            overworld.setThundering(false);
        }
        Location bunker = plugin.arenas().bunker();
        for (Player player : playing()) {
            if (overworld == null || !player.getWorld().equals(overworld)) {
                continue;
            }
            boolean hit;
            if (bunker != null && bunker.getWorld().equals(player.getWorld())) {
                hit = player.getLocation().distance(bunker) > 6;
            } else {
                int top = player.getWorld().getHighestBlockAt(player.getLocation()).getY();
                hit = top <= player.getLocation().getBlockY();
            }
            if (!hit) {
                continue;
            }
            player.getWorld().strikeLightning(player.getLocation());
            player.damage(16);
            player.sendTitle(ChatColor.YELLOW + "TE ALCANZÓ EL RAYO", "", 5, 30, 10);
        }
        plugin.all(ChatColor.GRAY + "El rayo ya cayó.");
    }

    private void regen() {
        State state = plugin.state();
        if (state.sinRegen < 0) {
            return;
        }
        state.sinRegen--;
        if (state.sinRegen == 0) {
            state.sinRegen = -1;
            for (World world : Bukkit.getWorlds()) {
                world.setGameRule(GameRule.NATURAL_REGENERATION, true);
            }
            plugin.all(ChatColor.GREEN + "La regeneración vuelve.");
        }
    }

    private void fantasmas() {
        State state = plugin.state();
        if (state.fantasmas < 0) {
            return;
        }
        state.fantasmas--;
        if (state.fantasmas == 0) {
            state.fantasmas = -1;
            removeTagged(null, Phantom.class, "dedsafio_phantom");
            World world = plugin.arenas().overworld();
            if (world != null) {
                world.setTime(1000L);
            }
        }
    }

    private void gulag() {
        State state = plugin.state();
        if (!state.gulagActive) {
            return;
        }
        if (gulagGrace > 0) {
            gulagGrace--;
            return;
        }
        Player fighter = state.gulagFighter == null ? null : Bukkit.getPlayer(state.gulagFighter);
        Ravager rex = findRex();
        if (fighter == null || !fighter.isOnline()) {
            abortGulag();
            return;
        }
        if (rex == null || rex.isDead()) {
            gulagWin();
            return;
        }
        state.gulagTime--;
        double health = Math.max(0, rex.getHealth());
        KeyedBossBar bar = bar(trexBarKey, ChatColor.DARK_RED + "Tiranosaurio Rex", BarColor.RED, BarStyle.SEGMENTED_10);
        bar.setProgress(Math.min(1, health / 180.0));
        bar.setVisible(true);
        if (!bar.getPlayers().contains(fighter)) {
            bar.addPlayer(fighter);
        }
        Location back = plugin.arenas().gulagFight();
        if (back != null && (!fighter.getWorld().equals(back.getWorld()) || outside(fighter.getLocation(), -22, 22, state.floorY - 2, state.floorY + 24, -22, 22))) {
            fighter.teleport(back);
            fighter.setFallDistance(0);
        }
        if (state.gulagTime <= 0) {
            state.gulagTime = 40;
            fighter.sendTitle(ChatColor.RED + "SE ACABÓ EL TIEMPO", "", 0, 20, 5);
            fighter.damage(30, rex);
        } else if (ticks % 20 == 0) {
            fighter.sendActionBar(ChatColor.RED + "Gulag " + (state.gulagTime / 20) + "s");
        }
    }

    private void juicio() {
        State state = plugin.state();
        if (!state.juicioActive) {
            return;
        }
        state.juicioTime--;
        Player a = state.juicioA == null ? null : Bukkit.getPlayer(state.juicioA);
        Player b = state.juicioB == null ? null : Bukkit.getPlayer(state.juicioB);
        if (a != null) {
            keepJuicio(a, plugin.arenas().juicioA());
        }
        if (b != null) {
            keepJuicio(b, plugin.arenas().juicioB());
        }
        if (state.juicioTime <= 0) {
            empate();
            return;
        }
        if (ticks % 20 == 0) {
            String bar = ChatColor.GOLD + "Juicio " + (state.juicioTime / 20) + "s";
            if (a != null) {
                a.sendActionBar(bar);
            }
            if (b != null) {
                b.sendActionBar(bar);
            }
        }
    }

    private void qumara() {
        State state = plugin.state();
        if (state.qumara != 1) {
            return;
        }
        if (qumaraGrace > 0) {
            qumaraGrace--;
            return;
        }
        Warden warden = findWarden();
        if (warden == null || warden.isDead()) {
            state.qumara = 0;
            hideBar(qumaraBarKey);
            plugin.all(ChatColor.GRAY + "Qumara desapareció sin morir. Un admin puede invocarla otra vez.");
            state.save();
            return;
        }
        Player nearest = null;
        double nearestDistance = 48 * 48;
        for (Player player : warden.getWorld().getPlayers()) {
            if (plugin.state().get(player).status != State.Status.VIVO) {
                continue;
            }
            double distance = player.getLocation().distanceSquared(warden.getLocation());
            if (distance <= nearestDistance) {
                nearest = player;
                nearestDistance = distance;
            }
        }
        boolean near = nearest != null && nearestDistance <= 48 * 48;
        warden.setAI(near);
        warden.setAware(near);
        if (near && warden.getTarget() == null) {
            warden.setAnger(nearest, 120);
            warden.setTarget(nearest);
        }
        KeyedBossBar bar = bar(qumaraBarKey, ChatColor.DARK_PURPLE + "Qumara", BarColor.PURPLE, BarStyle.SEGMENTED_12);
        bar.setProgress(Math.min(1, Math.max(0, warden.getHealth() / 500.0)));
        bar.setVisible(true);
        for (Player player : Bukkit.getOnlinePlayers()) {
            if (!bar.getPlayers().contains(player)) {
                bar.addPlayer(player);
            }
        }
    }

    private void gulagWin() {
        State state = plugin.state();
        if (!state.gulagActive) {
            return;
        }
        UUID id = state.gulagFighter;
        state.gulagActive = false;
        state.gulagFighter = null;
        state.gulagTime = -1;
        hideBar(trexBarKey);
        removeTagged(plugin.arenas().eventos(), Ravager.class, "dedsafio_trex");
        Player player = id == null ? null : Bukkit.getPlayer(id);
        if (player != null) {
            state.nextCinema(id);
            state.get(player).status = State.Status.VIVO;
            player.setGameMode(GameMode.SURVIVAL);
            Location camp = plugin.arenas().campStand();
            if (camp != null) {
                player.teleport(camp);
                player.setFallDistance(0);
            }
            player.sendTitle(ChatColor.GREEN + "VOLVISTE", ChatColor.GOLD + "Venciste al T-Rex", 5, 40, 10);
            player.playSound(player.getLocation(), Sound.UI_TOAST_CHALLENGE_COMPLETE, 1f, 1f);
            plugin.all(ChatColor.GREEN + player.getName() + ChatColor.GOLD + " venció al Tiranosaurio Rex y regresa al mundo.");
        }
        plugin.refreshSidebar();
        state.save();
    }

    private void startJuicio() {
        State state = plugin.state();
        if (state.juicioQueue.size() < 2 || state.juicioActive) {
            return;
        }
        UUID first = state.juicioQueue.remove(0);
        UUID second = state.juicioQueue.remove(0);
        Player a = Bukkit.getPlayer(first);
        Player b = Bukkit.getPlayer(second);
        if (a == null || b == null || state.get(a).status != State.Status.VIVO || state.get(b).status != State.Status.VIVO) {
            plugin.all(ChatColor.GRAY + "La fila del Juicio se rompió. Hay que anotarse otra vez.");
            state.juicioQueue.clear();
            return;
        }
        if (plugin.arenas().juicioA() == null || plugin.arenas().juicioB() == null) {
            plugin.all(ChatColor.RED + "La arena del Juicio no está lista.");
            return;
        }
        state.juicioActive = true;
        state.juicioOpen = false;
        state.juicioA = first;
        state.juicioB = second;
        state.juicioTime = 1200;
        plugin.setPvp(true);
        a.setGameMode(GameMode.ADVENTURE);
        b.setGameMode(GameMode.ADVENTURE);
        a.teleport(plugin.arenas().juicioA());
        b.teleport(plugin.arenas().juicioB());
        a.setFallDistance(0);
        b.setFallDistance(0);
        a.sendTitle(ChatColor.GOLD + "JUICIO", ChatColor.RED + "El perdedor cae", 5, 40, 10);
        b.sendTitle(ChatColor.GOLD + "JUICIO", ChatColor.RED + "El perdedor cae", 5, 40, 10);
        plugin.all(ChatColor.GOLD + "Juicio: " + ChatColor.RED + a.getName() + ChatColor.GRAY + " contra " + ChatColor.BLUE + b.getName());
        a.playSound(a.getLocation(), Sound.ENTITY_ENDER_DRAGON_GROWL, 0.4f, 1.4f);
        b.playSound(b.getLocation(), Sound.ENTITY_ENDER_DRAGON_GROWL, 0.4f, 1.4f);
        state.save();
    }

    void juicioLose(Player dead) {
        State state = plugin.state();
        if (!state.isJuicioFighter(dead.getUniqueId())) {
            fall(dead);
            return;
        }
        Player winner = otherFighter(dead.getUniqueId());
        closeJuicioSilent();
        if (winner != null && winner.isOnline()) {
            sendWinner(winner);
        }
        fall(dead);
    }

    private void empate() {
        State state = plugin.state();
        Player a = state.juicioA == null ? null : Bukkit.getPlayer(state.juicioA);
        Player b = state.juicioB == null ? null : Bukkit.getPlayer(state.juicioB);
        closeJuicioSilent();
        plugin.all(ChatColor.YELLOW + "El Juicio termina en empate. Nadie cae.");
        sendHome(a);
        sendHome(b);
        state.save();
    }

    private void sendWinner(Player player) {
        player.setGameMode(GameMode.SURVIVAL);
        Location camp = plugin.arenas().campStand();
        if (camp != null) {
            player.teleport(camp);
            player.setFallDistance(0);
        }
        player.sendTitle(ChatColor.GOLD + "GANASTE EL JUICIO", "", 5, 40, 10);
        player.playSound(player.getLocation(), Sound.UI_TOAST_CHALLENGE_COMPLETE, 1f, 1f);
        plugin.all(ChatColor.GOLD + player.getName() + ChatColor.GREEN + " ganó el Juicio.");
    }

    private void sendHome(Player player) {
        if (player == null || !player.isOnline()) {
            return;
        }
        player.setGameMode(GameMode.SURVIVAL);
        Location camp = plugin.arenas().campStand();
        if (camp != null) {
            player.teleport(camp);
            player.setFallDistance(0);
        }
    }

    private void closeJuicioSilent() {
        State state = plugin.state();
        state.juicioActive = false;
        state.juicioOpen = false;
        state.juicioA = null;
        state.juicioB = null;
        state.juicioQueue.clear();
        state.juicioTime = -1;
        plugin.setPvp(false);
    }

    private void abortGulagSilent() {
        State state = plugin.state();
        state.gulagActive = false;
        state.gulagFighter = null;
        state.gulagTime = -1;
        hideBar(trexBarKey);
        removeTagged(plugin.arenas().eventos(), Ravager.class, "dedsafio_trex");
    }

    private void qumaraDown(Location where) {
        State state = plugin.state();
        state.qumara = 2;
        hideBar(qumaraBarKey);
        plugin.all(ChatColor.LIGHT_PURPLE + "Qumara ha caído. El iceberg muestra una grieta.");
        titleAlive(ChatColor.DARK_PURPLE + "QUMARA CAE", "");
        for (Player player : Bukkit.getOnlinePlayers()) {
            if (state.get(player).status == State.Status.VIVO) {
                plugin.items().giveSpoon(player, 1);
            }
        }
        World world = where.getWorld() == null ? plugin.arenas().eventos() : where.getWorld();
        if (world != null) {
            Location drop = plugin.arenas().qumaraBoss();
            if (drop == null) {
                drop = where;
            }
            world.dropItemNaturally(drop.clone().add(0, 1, 0), new ItemStack(Material.TOTEM_OF_UNDYING));
            world.dropItemNaturally(drop.clone().add(0, 1, 1), new ItemStack(Material.NETHER_STAR));
        }
        pista();
        soundAll(Sound.UI_TOAST_CHALLENGE_COMPLETE, 1f, 1f);
        state.save();
    }

    private void hambre() {
        titleAlive("", ChatColor.DARK_GREEN + "Hambre");
        plugin.all(ChatColor.DARK_GREEN + "La ruleta vacía los estómagos.");
        effectAlive(new PotionEffect(PotionEffectType.HUNGER, 800, 2, true, false, true));
    }

    private void sinRegen() {
        plugin.state().sinRegen = 6000;
        for (World world : Bukkit.getWorlds()) {
            world.setGameRule(GameRule.NATURAL_REGENERATION, false);
        }
        titleAlive("", ChatColor.RED + "Sin regeneración");
        plugin.all(ChatColor.RED + "Durante cinco minutos las heridas no cierran solas.");
    }

    private void suerte() {
        titleAlive("", ChatColor.GOLD + "Suerte");
        List<Player> vivos = playing();
        if (vivos.isEmpty()) {
            plugin.all(ChatColor.GRAY + "La ruleta buscó a alguien y no había nadie en pie.");
            return;
        }
        Player pick = vivos.get(ThreadLocalRandom.current().nextInt(vivos.size()));
        plugin.items().giveSpoon(pick, 1);
        plugin.all(ChatColor.GOLD + "La ruleta le dio una cuchara a " + ChatColor.YELLOW + pick.getName());
    }

    private void fantasmasStart() {
        plugin.state().fantasmas = 900;
        World overworld = plugin.arenas().overworld();
        if (overworld != null) {
            overworld.setTime(18000L);
        }
        titleAlive("", ChatColor.GRAY + "Fantasmas");
        plugin.all(ChatColor.GRAY + "Algo baja del cielo.");
        for (Player player : playing()) {
            if (overworld != null && player.getWorld().equals(overworld)) {
                player.getWorld().spawn(player.getLocation().add(0, 15, 0), Phantom.class, CreatureSpawnEvent.SpawnReason.CUSTOM, phantom -> {
                    phantom.addScoreboardTag("dedsafio_phantom");
                    phantom.setPersistent(true);
                    phantom.setRemoveWhenFarAway(false);
                });
            }
        }
    }

    private void debilidad() {
        titleAlive("", ChatColor.DARK_GRAY + "Debilidad");
        plugin.all(ChatColor.DARK_GRAY + "Los golpes pesan menos. Los de ellos, no.");
        effectAlive(new PotionEffect(PotionEffectType.WEAKNESS, 1200, 1, true, false, true));
    }

    private void magma() {
        titleAlive("", ChatColor.GOLD + "Magma");
        plugin.all(ChatColor.GOLD + "EL MAGMA NO PERDONA. En el Nether aparecen cubos. En el mundo, el calor frena los pies.");
        for (Player player : playing()) {
            if (player.getWorld().getEnvironment() == World.Environment.NETHER) {
                player.getWorld().spawn(player.getLocation().add(2, 1, 2), MagmaCube.class, CreatureSpawnEvent.SpawnReason.CUSTOM, cube -> {
                    cube.setSize(2);
                    cube.addScoreboardTag("dedsafio_magma");
                    cube.setPersistent(true);
                    cube.setRemoveWhenFarAway(false);
                });
            } else if (player.getWorld().getEnvironment() == World.Environment.NORMAL
                    && !Arenas.EVENTOS.equals(player.getWorld().getName())) {
                player.addPotionEffect(new PotionEffect(PotionEffectType.SLOWNESS, 500, 1, true, false, true));
            }
        }
    }

    private void prisa() {
        titleAlive("", ChatColor.AQUA + "Prisa");
        plugin.all(ChatColor.AQUA + "Un respiro: prisa y velocidad para todos los que siguen en pie.");
        effectAlive(new PotionEffect(PotionEffectType.HASTE, 3600, 1, true, false, true));
        effectAlive(new PotionEffect(PotionEffectType.SPEED, 3600, 0, true, false, true));
    }

    void pista() {
        State state = plugin.state();
        state.pista++;
        if (state.pista > CLUES.length) {
            state.pista = 1;
        }
        plugin.all(ChatColor.AQUA + CLUES[state.pista - 1]);
    }

    private void comfortFallen() {
        for (Player player : Bukkit.getOnlinePlayers()) {
            State.Record record = plugin.state().peek(player.getUniqueId());
            if (record == null || record.status != State.Status.CAIDO || plugin.state().isGulagFighter(player.getUniqueId())) {
                continue;
            }
            player.setFoodLevel(20);
            player.setSaturation(20f);
            guard(player);
            if (!isInCinema(player.getUniqueId())) {
                player.sendActionBar(ChatColor.RED + "Cuchara de un compañero, o /gulag");
            }
        }
    }

    private void keepJuicio(Player player, Location home) {
        if (home == null) {
            return;
        }
        Location at = player.getLocation();
        int floor = plugin.state().floorY;
        if (!at.getWorld().equals(home.getWorld()) || outside(at, -14, 14, floor - 2, floor + 12, 68, 92)) {
            player.teleport(home);
            player.setFallDistance(0);
        }
    }

    private boolean outside(Location at, int minX, int maxX, int minY, int maxY, int minZ, int maxZ) {
        int x = at.getBlockX();
        int y = at.getBlockY();
        int z = at.getBlockZ();
        return x < minX || x > maxX || y < minY || y > maxY || z < minZ || z > maxZ;
    }

    private List<Player> playing() {
        List<Player> list = new ArrayList<>();
        for (Player player : Bukkit.getOnlinePlayers()) {
            GameMode mode = player.getGameMode();
            if (mode != GameMode.SURVIVAL && mode != GameMode.ADVENTURE) {
                continue;
            }
            if (plugin.state().get(player).status == State.Status.VIVO) {
                list.add(player);
            }
        }
        return list;
    }

    private void effectAlive(PotionEffect effect) {
        for (Player player : playing()) {
            player.addPotionEffect(effect);
        }
    }

    private void titleAlive(String title, String subtitle) {
        for (Player player : Bukkit.getOnlinePlayers()) {
            player.sendTitle(title, subtitle, 5, 40, 10);
        }
    }

    private void soundAlive(Sound sound, float volume, float pitch) {
        for (Player player : playing()) {
            player.playSound(player.getLocation(), sound, volume, pitch);
        }
    }

    private void soundAll(Sound sound, float volume, float pitch) {
        for (Player player : Bukkit.getOnlinePlayers()) {
            player.playSound(player.getLocation(), sound, volume, pitch);
        }
    }

    private Player otherFighter(UUID id) {
        State state = plugin.state();
        UUID other = id.equals(state.juicioA) ? state.juicioB : state.juicioA;
        return other == null ? null : Bukkit.getPlayer(other);
    }

    private Ravager findRex() {
        World world = plugin.arenas().eventos();
        if (world == null) {
            return null;
        }
        for (Ravager ravager : world.getEntitiesByClass(Ravager.class)) {
            if (ravager.getScoreboardTags().contains("dedsafio_trex") && !ravager.isDead()) {
                return ravager;
            }
        }
        return null;
    }

    private Warden findWarden() {
        World world = plugin.arenas().eventos();
        if (world == null) {
            return null;
        }
        for (Warden warden : world.getEntitiesByClass(Warden.class)) {
            if (warden.getScoreboardTags().contains("dedsafio_qumara") && !warden.isDead()) {
                return warden;
            }
        }
        return null;
    }

    private <T extends LivingEntity> void removeTagged(World only, Class<T> type, String tag) {
        List<World> worlds = only == null ? Bukkit.getWorlds() : List.of(only);
        for (World world : worlds) {
            for (T entity : world.getEntitiesByClass(type)) {
                if (entity.getScoreboardTags().contains(tag)) {
                    entity.remove();
                }
            }
        }
    }

    private KeyedBossBar bar(NamespacedKey key, String title, BarColor color, BarStyle style) {
        KeyedBossBar existing = Bukkit.getBossBar(key);
        if (existing != null) {
            return existing;
        }
        return Bukkit.createBossBar(key, title, color, style);
    }

    private void hideBar(NamespacedKey key) {
        KeyedBossBar bar = Bukkit.getBossBar(key);
        if (bar != null) {
            bar.removeAll();
            bar.setVisible(false);
        }
        Bukkit.removeBossBar(key);
    }

    private void attribute(LivingEntity entity, Attribute attribute, double value) {
        AttributeInstance instance = entity.getAttribute(attribute);
        if (instance == null) {
            entity.registerAttribute(attribute);
            instance = entity.getAttribute(attribute);
        }
        if (instance != null) {
            instance.setBaseValue(value);
        }
    }

    }
