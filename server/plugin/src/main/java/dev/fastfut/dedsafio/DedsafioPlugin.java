package dev.fastfut.dedsafio;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Difficulty;
import org.bukkit.GameRule;
import org.bukkit.World;
import org.bukkit.command.PluginCommand;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scoreboard.Criteria;
import org.bukkit.scoreboard.DisplaySlot;
import org.bukkit.scoreboard.Objective;
import org.bukkit.scoreboard.Scoreboard;
import org.bukkit.scoreboard.Team;

import java.io.File;
import java.util.List;
import java.util.Map;

public final class DedsafioPlugin extends JavaPlugin {
    static final List<String> TEAM_IDS = List.of("rojo", "azul", "verde", "amarillo", "naranja", "morado");
    private static final Map<String, ChatColor> TEAM_COLORS = Map.of(
            "rojo", ChatColor.RED,
            "azul", ChatColor.BLUE,
            "verde", ChatColor.GREEN,
            "amarillo", ChatColor.YELLOW,
            "naranja", ChatColor.GOLD,
            "morado", ChatColor.DARK_PURPLE
    );

    private State state;
    private Items items;
    private Arenas arenas;
    private Game game;
    private int buildAttempts;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        state = new State(new File(getDataFolder(), "state.yml"), getLogger());
        state.load();
        state.juicioActive = false;
        state.juicioOpen = false;
        state.juicioA = null;
        state.juicioB = null;
        state.juicioQueue.clear();
        items = new Items(this);
        items.registerRecipe();
        arenas = new Arenas(this);
        game = new Game(this);
        Commands commands = new Commands(this);
        for (String name : List.of("dedsafio", "equipo", "gulag", "juicio", "jefe", "iceberg")) {
            PluginCommand command = getCommand(name);
            if (command != null) {
                command.setExecutor(commands);
                command.setTabCompleter(commands);
            }
        }
        Bukkit.getPluginManager().registerEvents(new Listeners(this), this);
        setupScoreboard();
        for (World world : Bukkit.getWorlds()) {
            applyRules(world);
        }
        Bukkit.getScheduler().runTaskTimer(this, game::tick, 1L, 1L);
        Bukkit.getScheduler().runTaskLater(this, this::tryBuild, 100L);
        getLogger().info("DEDsafío 4 cargado. Las arenas se construyen en el mundo eventos.");
    }

    @Override
    public void onDisable() {
        if (game != null) {
            game.shutdown();
        }
        if (state != null) {
            state.save();
        }
        Bukkit.getScheduler().cancelTasks(this);
    }

    void tryBuild() {
        buildAttempts++;
        try {
            if (!arenas.ensureEventos()) {
                retryBuild("el mundo eventos todavía no existe");
                return;
            }
            if (!state.arenasBuilt && !arenas.buildArenas()) {
                retryBuild("la superficie del mundo plano todavía no está lista");
                return;
            }
            arenas.keepLoaded();
            if (!state.campBuilt && arenas.importedMap()) {
                getLogger().info("MAPA_IMPORTADO No toqué el terreno. Parate en un claro y usa /dedsafio campamento.");
            } else if (!state.campBuilt) {
                arenas.buildCamp(null);
            }
            game.onReady();
            getLogger().info("ARENAS_LISTAS floorY=" + state.floorY);
            if (state.campBuilt) {
                getLogger().info("CAMPAMENTO_LISTO");
            }
        } catch (RuntimeException exception) {
            getLogger().warning("Error al preparar DEDsafío: " + exception.getMessage());
            retryBuild(exception.getMessage());
        }
    }

    private void retryBuild(String reason) {
        if (buildAttempts >= 15) {
            getLogger().warning("No se pudo preparar el mapa (" + reason + "). Usa /dedsafio reconstruir.");
            return;
        }
        Bukkit.getScheduler().runTaskLater(this, this::tryBuild, 40L);
    }

    void applyRules(World world) {
        world.setDifficulty(Difficulty.HARD);
        world.setGameRule(GameRule.DO_IMMEDIATE_RESPAWN, true);
        world.setGameRule(GameRule.KEEP_INVENTORY, false);
        world.setGameRule(GameRule.SHOW_DEATH_MESSAGES, true);
        world.setGameRule(GameRule.NATURAL_REGENERATION, state.sinRegen < 0);
        boolean pvp = state.juicioActive;
        world.setGameRule(GameRule.PVP, pvp);
        world.setPVP(pvp);
        if (Arenas.EVENTOS.equals(world.getName())) {
            world.setGameRule(GameRule.DO_MOB_SPAWNING, false);
            world.setGameRule(GameRule.DO_DAYLIGHT_CYCLE, false);
            world.setGameRule(GameRule.DO_WEATHER_CYCLE, false);
        }
    }

    void setPvp(boolean enabled) {
        for (World world : Bukkit.getWorlds()) {
            world.setGameRule(GameRule.PVP, enabled);
            world.setPVP(enabled);
        }
    }

    void setupScoreboard() {
        Scoreboard board = Bukkit.getScoreboardManager().getMainScoreboard();
        Objective objective = board.getObjective("ds_side");
        if (objective == null) {
            objective = board.registerNewObjective("ds_side", Criteria.DUMMY, ChatColor.GOLD + "DEDsafío 4");
        }
        objective.setDisplayName(ChatColor.GOLD + "DEDsafío 4");
        objective.setDisplaySlot(DisplaySlot.SIDEBAR);
        for (String id : TEAM_IDS) {
            Team team = board.getTeam(id);
            if (team == null) {
                team = board.registerNewTeam(id);
            }
            team.setColor(TEAM_COLORS.getOrDefault(id, ChatColor.WHITE));
            team.setAllowFriendlyFire(true);
            team.setDisplayName(id);
        }
    }

    void refreshSidebar() {
        Scoreboard board = Bukkit.getScoreboardManager().getMainScoreboard();
        Objective objective = board.getObjective("ds_side");
        if (objective == null) {
            setupScoreboard();
            objective = board.getObjective("ds_side");
        }
        if (objective == null) {
            return;
        }
        objective.getScore(ChatColor.GREEN + "Vivos").setScore(state.count(State.Status.VIVO));
        objective.getScore(ChatColor.YELLOW + "Dia").setScore(state.day);
    }

    ChatColor teamColor(String team) {
        return TEAM_COLORS.getOrDefault(team, ChatColor.WHITE);
    }

    void all(String message) {
        Bukkit.broadcastMessage(message);
    }

    int cycleTicks() {
        int seconds = getConfig().getInt("ruleta-segundos", 600);
        if (seconds < 30) {
            seconds = 30;
        }
        return seconds * 20;
    }

    State state() {
        return state;
    }

    Items items() {
        return items;
    }

    Arenas arenas() {
        return arenas;
    }

    Game game() {
        return game;
    }
}
