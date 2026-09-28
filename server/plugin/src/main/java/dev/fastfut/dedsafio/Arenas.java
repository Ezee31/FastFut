package dev.fastfut.dedsafio;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.WorldCreator;
import org.bukkit.WorldType;
import org.bukkit.block.Block;
import org.bukkit.block.Sign;
import org.bukkit.block.sign.Side;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.entity.TextDisplay;

import java.util.ArrayList;
import java.util.List;

final class Arenas {
    static final String EVENTOS = "eventos";
    private final DedsafioPlugin plugin;

    Arenas(DedsafioPlugin plugin) {
        this.plugin = plugin;
    }

    boolean ensureEventos() {
        World world = Bukkit.getWorld(EVENTOS);
        if (world != null) {
            return true;
        }
        WorldCreator creator = new WorldCreator(EVENTOS);
        creator.type(WorldType.FLAT);
        creator.environment(World.Environment.NORMAL);
        creator.generateStructures(false);
        creator.seed(4L);
        world = creator.createWorld();
        if (world == null) {
            return false;
        }
        plugin.applyRules(world);
        world.setTime(1000L);
        world.setStorm(false);
        return true;
    }

    World eventos() {
        return Bukkit.getWorld(EVENTOS);
    }

    World overworld() {
        World world = Bukkit.getWorld("world");
        if (world != null) {
            return world;
        }
        for (World candidate : Bukkit.getWorlds()) {
            if (candidate.getEnvironment() == World.Environment.NORMAL && !EVENTOS.equals(candidate.getName())) {
                return candidate;
            }
        }
        return Bukkit.getWorlds().isEmpty() ? null : Bukkit.getWorlds().get(0);
    }

    boolean buildArenas() {
        if (!ensureEventos()) {
            return false;
        }
        World world = eventos();
        world.getChunkAt(0, 0).load();
        Block surface = world.getHighestBlockAt(0, 0);
        if (surface.getType().isAir() || surface.getY() <= world.getMinHeight()) {
            return false;
        }
        int floor = surface.getY();
        plugin.state().floorY = floor;
        clear(world, -32, floor + 1, -64, 32, floor + 8, 32);
        clear(world, 120, floor + 1, -32, 180, floor + 8, 32);
        clear(world, 270, floor + 1, -32, 330, floor + 8, 32);
        clear(world, -32, floor + 1, 60, 32, floor + 8, 112);
        gulag(world, floor);
        qumara(world, floor);
        iceberg(world, floor);
        juicio(world, floor);
        Location lobby = lobby();
        if (lobby != null) {
            world.setSpawnLocation(lobby.getBlockX(), lobby.getBlockY(), lobby.getBlockZ());
        }
        plugin.state().arenasBuilt = true;
        plugin.state().save();
        keepLoaded();
        return true;
    }

    void keepLoaded() {
        World world = eventos();
        if (world == null) {
            return;
        }
        keep(world, -32, -64, 32, 32);
        keep(world, 120, -32, 180, 32);
        keep(world, 270, -32, 330, 32);
        keep(world, -32, 60, 32, 112);
    }

    boolean importedMap() {
        World world = overworld();
        if (world == null) {
            return false;
        }
        java.io.File region = new java.io.File(world.getWorldFolder(), "region");
        java.io.File[] files = region.listFiles((dir, name) -> name.endsWith(".mca"));
        return files != null && files.length > 8;
    }

    boolean buildCamp(Player anchor) {
        World world = overworld();
        if (anchor != null && anchor.getWorld().getEnvironment() == World.Environment.NORMAL
                && !EVENTOS.equals(anchor.getWorld().getName())) {
            world = anchor.getWorld();
        }
        if (world == null) {
            return false;
        }
        int x = 8;
        int z = 8;
        if (anchor != null && anchor.getWorld().equals(world)) {
            x = anchor.getLocation().getBlockX();
            z = anchor.getLocation().getBlockZ();
        }
        world.getChunkAt(x >> 4, z >> 4).load();
        Block surface = world.getHighestBlockAt(x, z);
        if (surface.getType().isAir()) {
            return false;
        }
        int feet = surface.getY() + 1;
        clear(world, x - 5, feet, z - 5, x + 5, feet + 4, z + 5);
        fill(world, x - 5, feet - 1, z - 5, x + 5, feet - 1, z + 5, Material.COBBLESTONE);
        set(world, x, feet, z, "minecraft:campfire[lit=true]");
        set(world, x + 2, feet, z, Material.CRAFTING_TABLE);
        set(world, x, feet, z + 2, Material.SMITHING_TABLE);
        set(world, x - 4, feet, z, Material.TORCH);
        set(world, x + 4, feet, z, Material.TORCH);
        set(world, x, feet, z + 4, Material.TORCH);
        set(world, x, feet, z - 4, Material.TORCH);
        sign(world, x, feet, z - 3, "8", "CAMPAMENTO", "Bunker al sur", "Lee el libro", "");
        barrel(world, x - 2, feet, z);
        fill(world, x - 3, feet - 1, z + 24, x + 3, feet + 4, z + 32, Material.DEEPSLATE_BRICKS);
        fill(world, x - 2, feet, z + 25, x + 2, feet + 3, z + 31, Material.AIR);
        set(world, x, feet, z + 24, "minecraft:iron_door[facing=north,half=lower,hinge=left,open=false]");
        set(world, x, feet + 1, z + 24, "minecraft:iron_door[facing=north,half=upper,hinge=left,open=false]");
        set(world, x, feet + 2, z + 28, "minecraft:lantern[hanging=true]");
        set(world, x, feet, z + 28, "minecraft:light[level=15]");
        try {
            rulesDisplay(world, x + 0.5, feet + 2.2, z - 1.5);
        } catch (RuntimeException exception) {
            plugin.getLogger().warning("No se pudo poner el letrero flotante: " + exception.getMessage());
        }
        world.setSpawnLocation(x + 1, feet, z);
        State state = plugin.state();
        state.campBuilt = true;
        state.bunker = true;
        state.campWorld = world.getName();
        state.campX = x;
        state.campY = feet;
        state.campZ = z;
        state.bunkerX = x;
        state.bunkerY = feet;
        state.bunkerZ = z + 28;
        state.save();
        plugin.getLogger().info("CAMPAMENTO_LISTO");
        return true;
    }

    Location campStand() {
        State state = plugin.state();
        World world = Bukkit.getWorld(state.campWorld);
        if (!state.campBuilt || world == null) {
            World overworld = overworld();
            return overworld == null ? null : overworld.getSpawnLocation();
        }
        return new Location(world, state.campX + 1.5, state.campY, state.campZ + 0.5);
    }

    Location campSpectator() {
        Location camp = campStand();
        if (camp == null) {
            return null;
        }
        Location copy = camp.clone();
        copy.setY(copy.getY() + 24);
        return copy;
    }

    Location bunker() {
        State state = plugin.state();
        if (!state.bunker) {
            return null;
        }
        World world = Bukkit.getWorld(state.campWorld);
        if (world == null) {
            return null;
        }
        return new Location(world, state.bunkerX + 0.5, state.bunkerY, state.bunkerZ + 0.5);
    }

    Location lobby() {
        return at(0, -46, 180);
    }

    Location gulagFight() {
        return at(0, -8, 0);
    }

    Location rex() {
        return at(0, 10, 180);
    }

    Location qumaraPlayer() {
        return at(150, -14, 0);
    }

    Location qumaraBoss() {
        return at(150, -6, 0);
    }

    Location icebergPlayer() {
        return at(300, -10, 0);
    }

    Location juicioA() {
        return at(-6, 80, 90);
    }

    Location juicioB() {
        return at(6, 80, -90);
    }

    int floor() {
        return plugin.state().floorY;
    }

    List<String> verify() {
        List<String> lines = new ArrayList<>();
        World world = eventos();
        int floor = plugin.state().floorY;
        if (world == null || floor < world.getMinHeight()) {
            lines.add("mundo=FAIL");
            return lines;
        }
        lines.add(check(world, -20, floor, -20, Material.STONE_BRICKS, "gulag"));
        lines.add(check(world, 0, floor, 0, Material.RED_TERRACOTTA, "centro"));
        lines.add(check(world, 130, floor, -20, Material.DEEPSLATE_TILES, "qumara_piso"));
        lines.add(check(world, 150, floor, 0, Material.SCULK, "qumara"));
        lines.add(check(world, 300, floor, 0, Material.PACKED_ICE, "iceberg"));
        lines.add(check(world, 0, floor, 80, Material.QUARTZ_BLOCK, "juicio"));
        lines.add(check(world, 0, floor + 1, -48, Material.OAK_SIGN, "cartel"));
        State state = plugin.state();
        World campWorld = Bukkit.getWorld(state.campWorld);
        if (!state.campBuilt || campWorld == null) {
            lines.add("campamento=FAIL");
            lines.add("bunker=FAIL");
        } else {
            lines.add(check(campWorld, state.campX, state.campY, state.campZ, Material.CAMPFIRE, "fogata"));
            lines.add(check(campWorld, state.campX, state.campY, state.campZ + 24, Material.IRON_DOOR, "puerta"));
            Block barrel = campWorld.getBlockAt(state.campX - 2, state.campY, state.campZ);
            boolean bread = false;
            if (barrel.getType() == Material.BARREL && barrel.getState() instanceof org.bukkit.block.Barrel box) {
                var first = box.getInventory().getItem(0);
                bread = first != null && first.getType() == Material.BREAD;
            }
            lines.add(barrel.getType() == Material.BARREL ? "barril=OK" : "barril=FAIL");
            lines.add(bread ? "pan=OK" : "pan=FAIL");
            lines.add(state.bunker ? "bunker=OK" : "bunker=FAIL");
        }
        return lines;
    }

    private Location at(int x, int z, float yaw) {
        World world = eventos();
        if (world == null || !plugin.state().arenasBuilt || plugin.state().floorY < world.getMinHeight()) {
            return null;
        }
        return new Location(world, x + 0.5, plugin.state().floorY + 1, z + 0.5, yaw, 0);
    }

    private void gulag(World world, int floor) {
        fill(world, -24, floor, -24, 24, floor, 24, Material.STONE_BRICKS);
        fill(world, -8, floor, -8, 8, floor, 8, Material.RED_TERRACOTTA);
        fill(world, -24, floor + 1, -24, 24, floor + 4, -24, Material.IRON_BARS);
        fill(world, -3, floor, -31, 3, floor, -25, Material.STONE_BRICKS);
        fill(world, -24, floor + 1, 24, 24, floor + 4, 24, Material.DEEPSLATE_BRICKS);
        fill(world, -24, floor + 1, -24, -24, floor + 4, 24, Material.DEEPSLATE_BRICKS);
        fill(world, 24, floor + 1, -24, 24, floor + 4, 24, Material.DEEPSLATE_BRICKS);
        fill(world, -24, floor + 1, -23, 24, floor + 3, -23, Material.AIR);
        fill(world, -16, floor, -52, 16, floor, -32, Material.POLISHED_DEEPSLATE);
        fill(world, -16, floor + 1, -52, 16, floor + 5, -52, Material.DEEPSLATE_BRICKS);
        fill(world, -16, floor + 1, -52, -16, floor + 5, -32, Material.DEEPSLATE_BRICKS);
        fill(world, 16, floor + 1, -52, 16, floor + 5, -32, Material.DEEPSLATE_BRICKS);
        fill(world, -16, floor + 5, -52, 16, floor + 5, -32, Material.BARRIER);
        fill(world, -16, floor + 1, -32, 16, floor + 4, -32, Material.IRON_BARS);
        fill(world, -2, floor + 1, -32, 2, floor + 3, -32, Material.AIR);
        set(world, -22, floor + 1, -22, Material.SEA_LANTERN);
        set(world, 22, floor + 1, -22, Material.SEA_LANTERN);
        set(world, -22, floor + 1, 22, Material.SEA_LANTERN);
        set(world, 22, floor + 1, 22, Material.SEA_LANTERN);
        set(world, 0, floor + 2, 0, Material.SEA_LANTERN);
        set(world, -14, floor + 1, -50, Material.RED_BANNER);
        set(world, 14, floor + 1, -50, Material.RED_BANNER);
        set(world, 0, floor + 3, 8, "minecraft:light[level=15]");
        set(world, 0, floor + 3, -46, "minecraft:light[level=15]");
        sign(world, 0, floor + 1, -48, "8", "GULAG", "/gulag", "para el T-Rex", "o una cuchara");
    }

    private void qumara(World world, int floor) {
        fill(world, 128, floor, -22, 172, floor, 22, Material.DEEPSLATE_TILES);
        fill(world, 142, floor, -8, 158, floor, 8, Material.SCULK);
        fill(world, 128, floor + 1, -22, 172, floor + 5, -22, Material.REINFORCED_DEEPSLATE);
        fill(world, 128, floor + 1, 22, 172, floor + 5, 22, Material.REINFORCED_DEEPSLATE);
        fill(world, 128, floor + 1, -22, 128, floor + 5, 22, Material.REINFORCED_DEEPSLATE);
        fill(world, 172, floor + 1, -22, 172, floor + 5, 22, Material.REINFORCED_DEEPSLATE);
        fill(world, 148, floor + 1, -22, 152, floor + 3, -22, Material.AIR);
        set(world, 136, floor + 1, -10, Material.SOUL_LANTERN);
        set(world, 164, floor + 1, -10, Material.SOUL_LANTERN);
        set(world, 136, floor + 1, 10, Material.SOUL_LANTERN);
        set(world, 164, floor + 1, 10, Material.SOUL_LANTERN);
        set(world, 150, floor + 1, 0, Material.CRYING_OBSIDIAN);
        set(world, 150, floor + 2, 4, "minecraft:light[level=15]");
        sign(world, 150, floor + 1, -16, "0", "QUMARA", "El admin invoca", "/jefe", "para volver");
    }

    private void iceberg(World world, int floor) {
        fill(world, 286, floor, -16, 314, floor, 16, Material.PACKED_ICE);
        fill(world, 286, floor + 1, -16, 314, floor + 4, -16, Material.BLUE_STAINED_GLASS);
        fill(world, 286, floor + 1, 16, 314, floor + 4, 16, Material.BLUE_STAINED_GLASS);
        fill(world, 286, floor + 1, -16, 286, floor + 4, 16, Material.BLUE_STAINED_GLASS);
        fill(world, 314, floor + 1, -16, 314, floor + 4, 16, Material.BLUE_STAINED_GLASS);
        fill(world, 298, floor + 1, -16, 302, floor + 3, -16, Material.AIR);
        fill(world, 296, floor + 1, -6, 304, floor + 1, 6, Material.BLUE_ICE);
        set(world, 300, floor + 2, 0, Material.SEA_LANTERN);
        set(world, 300, floor + 3, 0, "minecraft:light[level=15]");
        sign(world, 296, floor + 1, -2, "4", "ICEBERG", "Pistas de ruleta", "No es oficial", "");
        sign(world, 304, floor + 1, 2, "12", "Qumara es puerta", "Cucharas eligen", "El T-Rex lista", "Dia 5 el Nether");
    }

    private void juicio(World world, int floor) {
        fill(world, -14, floor, 68, 14, floor, 92, Material.QUARTZ_BLOCK);
        fill(world, -10, floor, 74, -3, floor, 86, Material.RED_CONCRETE);
        fill(world, 3, floor, 74, 10, floor, 86, Material.BLUE_CONCRETE);
        fill(world, -14, floor + 1, 68, 14, floor + 3, 68, Material.STONE_BRICKS);
        fill(world, -14, floor + 1, 92, 14, floor + 3, 92, Material.STONE_BRICKS);
        fill(world, -14, floor + 1, 68, -14, floor + 3, 92, Material.STONE_BRICKS);
        fill(world, 14, floor + 1, 68, 14, floor + 3, 92, Material.STONE_BRICKS);
        fill(world, -1, floor + 1, 74, -1, floor + 2, 86, Material.IRON_BARS);
        fill(world, 1, floor + 1, 74, 1, floor + 2, 86, Material.IRON_BARS);
        set(world, 0, floor + 1, 80, Material.SEA_LANTERN);
        set(world, 0, floor + 3, 80, "minecraft:light[level=15]");
        sign(world, 0, floor + 1, 90, "8", "JUICIO", "El perdedor cae", "PvP solo aqui", "");
    }

    private void rulesDisplay(World world, double x, double y, double z) {
        Location location = new Location(world, x, y, z);
        for (Entity entity : world.getNearbyEntities(location, 6, 6, 6)) {
            if (entity instanceof TextDisplay && entity.getScoreboardTags().contains("dedsafio_reglas")) {
                entity.remove();
            }
        }
        world.spawn(location, TextDisplay.class, display -> {
            display.setText("§6DEDsafío 4\n§fSi caes, cuchara o Gulag.\n§fPerder el Gulag elimina.\n§fPvP solo en el Juicio.");
            display.setBillboard(org.bukkit.entity.Display.Billboard.CENTER);
            display.setShadowed(true);
            display.setSeeThrough(false);
            display.setAlignment(TextDisplay.TextAlignment.CENTER);
            display.setLineWidth(180);
            display.setDefaultBackground(false);
            display.setBackgroundColor(org.bukkit.Color.fromARGB(150, 8, 8, 12));
            display.addScoreboardTag("dedsafio_reglas");
        });
    }

    private String check(World world, int x, int y, int z, Material material, String name) {
        world.getChunkAt(x >> 4, z >> 4).load();
        return world.getBlockAt(x, y, z).getType() == material ? name + "=OK" : name + "=FAIL";
    }

    private void clear(World world, int x1, int y1, int z1, int x2, int y2, int z2) {
        fill(world, x1, y1, z1, x2, y2, z2, Material.AIR);
    }

    private void fill(World world, int x1, int y1, int z1, int x2, int y2, int z2, Material material) {
        int minX = Math.min(x1, x2);
        int maxX = Math.max(x1, x2);
        int minY = Math.min(y1, y2);
        int maxY = Math.max(y1, y2);
        int minZ = Math.min(z1, z2);
        int maxZ = Math.max(z1, z2);
        for (int cx = minX >> 4; cx <= maxX >> 4; cx++) {
            for (int cz = minZ >> 4; cz <= maxZ >> 4; cz++) {
                world.getChunkAt(cx, cz).load();
            }
        }
        for (int x = minX; x <= maxX; x++) {
            for (int y = minY; y <= maxY; y++) {
                for (int z = minZ; z <= maxZ; z++) {
                    world.getBlockAt(x, y, z).setType(material, false);
                }
            }
        }
    }

    private void set(World world, int x, int y, int z, Material material) {
        world.getChunkAt(x >> 4, z >> 4).load();
        world.getBlockAt(x, y, z).setType(material, false);
    }

    private void set(World world, int x, int y, int z, String data) {
        world.getChunkAt(x >> 4, z >> 4).load();
        world.getBlockAt(x, y, z).setBlockData(Bukkit.createBlockData(data), false);
    }

    private void sign(World world, int x, int y, int z, String rotation, String... lines) {
        set(world, x, y, z, "minecraft:oak_sign[rotation=" + rotation + "]");
        if (world.getBlockAt(x, y, z).getState() instanceof Sign sign) {
            var side = sign.getSide(Side.FRONT);
            for (int i = 0; i < 4; i++) {
                side.setLine(i, i < lines.length ? lines[i] : "");
            }
            sign.update(false, false);
        }
    }

    private void barrel(World world, int x, int y, int z) {
        set(world, x, y, z, Material.BARREL);
        if (world.getBlockAt(x, y, z).getState() instanceof org.bukkit.block.Barrel barrel) {
            var inventory = barrel.getSnapshotInventory();
            inventory.setItem(0, new org.bukkit.inventory.ItemStack(Material.BREAD, 16));
            inventory.setItem(1, new org.bukkit.inventory.ItemStack(Material.TORCH, 32));
            inventory.setItem(2, new org.bukkit.inventory.ItemStack(Material.COOKED_BEEF, 16));
            barrel.update(true, false);
        }
    }

    private void keep(World world, int x1, int z1, int x2, int z2) {
        int minX = Math.min(x1, x2) >> 4;
        int maxX = Math.max(x1, x2) >> 4;
        int minZ = Math.min(z1, z2) >> 4;
        int maxZ = Math.max(z1, z2) >> 4;
        for (int cx = minX; cx <= maxX; cx++) {
            for (int cz = minZ; cz <= maxZ; cz++) {
                world.getChunkAt(cx, cz).setForceLoaded(true);
            }
        }
    }
}
