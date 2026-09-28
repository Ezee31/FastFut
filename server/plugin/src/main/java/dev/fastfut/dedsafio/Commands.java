package dev.fastfut.dedsafio;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

final class Commands implements CommandExecutor, TabCompleter {
    private static final List<String> ADMIN = List.of(
            "kit", "ruleta", "rayo", "eclipse", "qumara", "juicio", "dia", "cuchara",
            "campamento", "calmar", "perdonar", "abortar", "ciclo", "verificar", "reconstruir", "status", "libro"
    );
    private final DedsafioPlugin plugin;

    Commands(DedsafioPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        String name = command.getName().toLowerCase(Locale.ROOT);
        return switch (name) {
            case "equipo" -> team(sender, args);
            case "gulag" -> gulag(sender);
            case "juicio" -> juicio(sender);
            case "jefe" -> go(sender, plugin.arenas().qumaraPlayer(), "Solo quien sigue en pie entra a la arena.");
            case "iceberg" -> go(sender, plugin.arenas().icebergPlayer(), "Solo quien sigue en pie entra al iceberg.");
            default -> admin(sender, args);
        };
    }

    private boolean team(CommandSender sender, String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage(ChatColor.RED + "El equipo se elige dentro del juego.");
            return true;
        }
        if (args.length < 1) {
            player.sendMessage(ChatColor.GRAY + "Usa /equipo rojo, azul, verde, amarillo, naranja o morado.");
            return true;
        }
        if (!plugin.game().chooseTeam(player, args[0].toLowerCase(Locale.ROOT))) {
            player.sendMessage(ChatColor.GRAY + "Ese equipo no existe.");
        }
        return true;
    }

    private boolean gulag(CommandSender sender) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage(ChatColor.RED + "Entra al Gulag desde el juego.");
            return true;
        }
        plugin.game().enterGulag(player);
        return true;
    }

    private boolean juicio(CommandSender sender) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage(ChatColor.RED + "El Juicio se anota dentro del juego.");
            return true;
        }
        plugin.game().joinJuicio(player);
        return true;
    }

    private boolean go(CommandSender sender, org.bukkit.Location location, String denied) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage(ChatColor.RED + "Ese viaje es de un jugador.");
            return true;
        }
        plugin.game().go(player, location, denied);
        return true;
    }

    private boolean admin(CommandSender sender, String[] args) {
        if (args.length == 0) {
            help(sender);
            return true;
        }
        String sub = args[0].toLowerCase(Locale.ROOT);
        if (!sender.hasPermission("dedsafio.admin")) {
            help(sender);
            return true;
        }
        switch (sub) {
            case "kit" -> {
                if (sender instanceof Player player) {
                    plugin.items().giveKit(player);
                } else {
                    sender.sendMessage(ChatColor.RED + "El kit se entrega a un jugador.");
                }
            }
            case "libro" -> {
                if (sender instanceof Player player) {
                    plugin.items().giveRules(player);
                } else {
                    sender.sendMessage(ChatColor.RED + "El libro se entrega a un jugador.");
                }
            }
            case "ruleta" -> plugin.game().girar();
            case "rayo" -> plugin.game().rayoStart();
            case "eclipse" -> plugin.game().eclipseStart();
            case "qumara" -> plugin.game().qumaraSummon();
            case "juicio" -> plugin.game().openJuicio();
            case "dia" -> plugin.game().nuevoDia();
            case "cuchara" -> spoon(sender, args);
            case "campamento" -> camp(sender);
            case "calmar" -> plugin.game().calmar();
            case "perdonar" -> plugin.game().perdonar();
            case "abortar" -> {
                if (!plugin.state().gulagActive) {
                    sender.sendMessage(ChatColor.GRAY + "No hay un Gulag activo.");
                } else {
                    plugin.game().abortGulag();
                }
            }
            case "ciclo" -> cycle(sender, args);
            case "verificar" -> verify(sender);
            case "reconstruir" -> rebuild(sender);
            case "status" -> status(sender);
            default -> help(sender);
        }
        return true;
    }

    private void spoon(CommandSender sender, String[] args) {
        Player target = sender instanceof Player player ? player : null;
        if (args.length >= 2) {
            target = Bukkit.getPlayerExact(args[1]);
        }
        if (target == null) {
            sender.sendMessage(ChatColor.RED + "No encontré a ese jugador.");
            return;
        }
        plugin.items().giveSpoon(target, 1);
        sender.sendMessage(ChatColor.GOLD + "Cuchara para " + target.getName() + ".");
    }

    private void camp(CommandSender sender) {
        Player anchor = sender instanceof Player player ? player : null;
        if (plugin.arenas().buildCamp(anchor)) {
            sender.sendMessage(ChatColor.GREEN + "Campamento listo. El búnker está 28 bloques al sur. El spawn quedó al lado de la fogata.");
        } else {
            sender.sendMessage(ChatColor.RED + "No se pudo construir el campamento.");
        }
    }

    private void cycle(CommandSender sender, String[] args) {
        if (args.length < 2) {
            sender.sendMessage(ChatColor.GRAY + "La ruleta gira cada " + (plugin.cycleTicks() / 20) + " segundos. /dedsafio ciclo <segundos>");
            return;
        }
        int seconds;
        try {
            seconds = Integer.parseInt(args[1]);
        } catch (NumberFormatException exception) {
            sender.sendMessage(ChatColor.RED + "Eso no es un número de segundos.");
            return;
        }
        if (seconds < 30) {
            seconds = 30;
        }
        plugin.getConfig().set("ruleta-segundos", seconds);
        plugin.saveConfig();
        sender.sendMessage(ChatColor.GREEN + "La ruleta ahora gira cada " + seconds + " segundos.");
    }

    private void verify(CommandSender sender) {
        List<String> lines = plugin.arenas().verify();
        boolean ok = true;
        for (String line : lines) {
            sender.sendMessage(line);
            plugin.getLogger().info(line);
            if (line.endsWith("=FAIL")) {
                ok = false;
            }
        }
        String end = ok ? "VERIFICAR_LISTO" : "VERIFICAR_FAIL";
        sender.sendMessage(end);
        plugin.getLogger().info(end);
    }

    private void rebuild(CommandSender sender) {
        plugin.state().arenasBuilt = false;
        if (!plugin.arenas().buildArenas()) {
            sender.sendMessage(ChatColor.RED + "No se pudieron reconstruir las arenas.");
            plugin.getLogger().info("VERIFICAR_FAIL");
            return;
        }
        sender.sendMessage(ChatColor.GREEN + "Arenas reconstruidas. floorY=" + plugin.state().floorY);
        verify(sender);
    }

    private void status(CommandSender sender) {
        State state = plugin.state();
        sender.sendMessage(ChatColor.GOLD + "Día " + state.day
                + ChatColor.GRAY + " · vivos " + state.count(State.Status.VIVO)
                + " · caídos " + state.count(State.Status.CAIDO)
                + " · eliminados " + state.count(State.Status.ELIMINADO));
        sender.sendMessage(ChatColor.GRAY + "Gulag " + (state.gulagActive ? "activo" : "quieto")
                + " · Juicio " + (state.juicioActive ? "en curso" : state.juicioOpen ? "abierto" : "cerrado")
                + " · Qumara " + (state.qumara == 1 ? "viva" : state.qumara == 2 ? "caída" : "ausente"));
        sender.sendMessage(ChatColor.GRAY + "Ruleta en " + Math.max(0, (plugin.cycleTicks() - state.reloj) / 20) + "s");
    }

    private void help(CommandSender sender) {
        sender.sendMessage(ChatColor.GOLD + "DEDsafío 4");
        sender.sendMessage(ChatColor.GRAY + "/equipo <color>  /gulag  /juicio  /jefe  /iceberg");
        if (!sender.hasPermission("dedsafio.admin")) {
            return;
        }
        sender.sendMessage(ChatColor.GRAY + "/dedsafio kit, ruleta, rayo, eclipse, qumara, juicio, dia, cuchara");
        sender.sendMessage(ChatColor.GRAY + "/dedsafio campamento, calmar, perdonar, abortar, ciclo, verificar, reconstruir, status");
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        List<String> options = new ArrayList<>();
        String name = command.getName().toLowerCase(Locale.ROOT);
        if ("equipo".equals(name) && args.length == 1) {
            options.addAll(DedsafioPlugin.TEAM_IDS);
        } else if ("dedsafio".equals(name) && args.length == 1 && sender.hasPermission("dedsafio.admin")) {
            options.addAll(ADMIN);
        } else if ("dedsafio".equals(name) && args.length == 2 && "cuchara".equalsIgnoreCase(args[0])) {
            for (Player player : Bukkit.getOnlinePlayers()) {
                options.add(player.getName());
            }
        }
        String prefix = args.length == 0 ? "" : args[args.length - 1].toLowerCase(Locale.ROOT);
        options.removeIf(option -> !option.toLowerCase(Locale.ROOT).startsWith(prefix));
        return options;
    }
}
