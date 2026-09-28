package dev.fastfut.dedsafio;

import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

final class State {
    enum Status {
        VIVO,
        CAIDO,
        ELIMINADO
    }

    static final class Record {
        String name;
        Status status = Status.VIVO;
        String team;
        boolean book;

        Record(String name) {
            this.name = name;
        }
    }

    int day = 1;
    int reloj;
    int pista;
    int qumara;
    int eclipse = -1;
    int rayo = -1;
    int sinRegen = -1;
    int fantasmas = -1;
    int pulso;
    boolean gulagActive;
    UUID gulagFighter;
    int gulagTime = -1;
    boolean juicioOpen;
    boolean juicioActive;
    UUID juicioA;
    UUID juicioB;
    final List<UUID> juicioQueue = new ArrayList<>();
    int juicioTime = -1;
    int floorY = -1;
    boolean arenasBuilt;
    boolean campBuilt;
    boolean bunker;
    int campX;
    int campY;
    int campZ;
    String campWorld = "world";
    int bunkerX;
    int bunkerY;
    int bunkerZ;

    private final Map<UUID, Record> players = new LinkedHashMap<>();
    private final Map<UUID, Integer> cinema = new LinkedHashMap<>();
    private final File file;
    private final Logger logger;

    State(File file, Logger logger) {
        this.file = file;
        this.logger = logger;
    }

    void load() {
        if (!file.exists()) {
            return;
        }
        YamlConfiguration yaml = YamlConfiguration.loadConfiguration(file);
        day = yaml.getInt("day", 1);
        reloj = yaml.getInt("reloj", 0);
        pista = yaml.getInt("pista", 0);
        qumara = yaml.getInt("qumara", 0);
        eclipse = -1;
        rayo = -1;
        sinRegen = -1;
        fantasmas = -1;
        pulso = 0;
        gulagActive = yaml.getBoolean("gulagActive", false);
        gulagFighter = uuid(yaml.getString("gulagFighter"));
        gulagTime = yaml.getInt("gulagTime", -1);
        juicioOpen = yaml.getBoolean("juicioOpen", false);
        juicioActive = yaml.getBoolean("juicioActive", false);
        juicioA = uuid(yaml.getString("juicioA"));
        juicioB = uuid(yaml.getString("juicioB"));
        juicioQueue.clear();
        for (String raw : yaml.getStringList("juicioQueue")) {
            UUID id = uuid(raw);
            if (id != null) {
                juicioQueue.add(id);
            }
        }
        juicioTime = yaml.getInt("juicioTime", -1);
        floorY = yaml.getInt("floorY", -1);
        arenasBuilt = yaml.getBoolean("arenasBuilt", false);
        campBuilt = yaml.getBoolean("campBuilt", false);
        bunker = yaml.getBoolean("bunker", false);
        campX = yaml.getInt("campX", 0);
        campY = yaml.getInt("campY", 0);
        campZ = yaml.getInt("campZ", 0);
        campWorld = yaml.getString("campWorld", "world");
        bunkerX = yaml.getInt("bunkerX", 0);
        bunkerY = yaml.getInt("bunkerY", 0);
        bunkerZ = yaml.getInt("bunkerZ", 0);
        players.clear();
        ConfigurationSection section = yaml.getConfigurationSection("players");
        if (section == null) {
            return;
        }
        for (String key : section.getKeys(false)) {
            UUID id = uuid(key);
            if (id == null) {
                continue;
            }
            Record record = new Record(section.getString(key + ".name", "?"));
            try {
                record.status = Status.valueOf(section.getString(key + ".status", "VIVO"));
            } catch (IllegalArgumentException ignored) {
                record.status = Status.VIVO;
            }
            String team = section.getString(key + ".team", "");
            record.team = team == null || team.isBlank() ? null : team;
            record.book = section.getBoolean(key + ".book", false);
            players.put(id, record);
        }
    }

    void save() {
        YamlConfiguration yaml = new YamlConfiguration();
        yaml.set("day", day);
        yaml.set("reloj", reloj);
        yaml.set("pista", pista);
        yaml.set("qumara", qumara);
        yaml.set("gulagActive", gulagActive);
        yaml.set("gulagFighter", gulagFighter == null ? "" : gulagFighter.toString());
        yaml.set("gulagTime", gulagTime);
        yaml.set("juicioOpen", juicioOpen);
        yaml.set("juicioActive", juicioActive);
        yaml.set("juicioA", juicioA == null ? "" : juicioA.toString());
        yaml.set("juicioB", juicioB == null ? "" : juicioB.toString());
        List<String> queue = new ArrayList<>();
        for (UUID id : juicioQueue) {
            queue.add(id.toString());
        }
        yaml.set("juicioQueue", queue);
        yaml.set("juicioTime", juicioTime);
        yaml.set("floorY", floorY);
        yaml.set("arenasBuilt", arenasBuilt);
        yaml.set("campBuilt", campBuilt);
        yaml.set("bunker", bunker);
        yaml.set("campX", campX);
        yaml.set("campY", campY);
        yaml.set("campZ", campZ);
        yaml.set("campWorld", campWorld);
        yaml.set("bunkerX", bunkerX);
        yaml.set("bunkerY", bunkerY);
        yaml.set("bunkerZ", bunkerZ);
        for (Map.Entry<UUID, Record> entry : players.entrySet()) {
            String path = "players." + entry.getKey();
            Record record = entry.getValue();
            yaml.set(path + ".name", record.name);
            yaml.set(path + ".status", record.status.name());
            yaml.set(path + ".team", record.team == null ? "" : record.team);
            yaml.set(path + ".book", record.book);
        }
        try {
            File parent = file.getParentFile();
            if (parent != null) {
                parent.mkdirs();
            }
            yaml.save(file);
        } catch (IOException exception) {
            logger.log(Level.WARNING, "No se pudo guardar el estado de DEDsafío", exception);
        }
    }

    Record get(org.bukkit.entity.Player player) {
        Record record = players.computeIfAbsent(player.getUniqueId(), id -> new Record(player.getName()));
        record.name = player.getName();
        return record;
    }

    Record peek(UUID id) {
        return players.get(id);
    }

    void reviveAll() {
        for (Record record : players.values()) {
            record.status = Status.VIVO;
        }
    }

    int count(Status status) {
        int total = 0;
        for (Record record : players.values()) {
            if (record.status == status) {
                total++;
            }
        }
        return total;
    }

    int nextCinema(UUID id) {
        int token = cinema.getOrDefault(id, 0) + 1;
        cinema.put(id, token);
        return token;
    }

    boolean cinemaIs(UUID id, int token) {
        return cinema.getOrDefault(id, 0) == token;
    }

    boolean isGulagFighter(UUID id) {
        return gulagActive && id.equals(gulagFighter);
    }

    boolean isJuicioFighter(UUID id) {
        return juicioActive && (id.equals(juicioA) || id.equals(juicioB));
    }

    private static UUID uuid(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
