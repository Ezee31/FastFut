package dev.fastfut.dedsafio;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.GameMode;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.entity.Projectile;
import org.bukkit.event.Event;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.event.entity.EntityPickupItemEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerMoveEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.PlayerRespawnEvent;
import org.bukkit.event.world.WorldLoadEvent;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.inventory.ItemStack;
import org.bukkit.projectiles.ProjectileSource;

import java.util.concurrent.ThreadLocalRandom;

final class Listeners implements Listener {
    private final DedsafioPlugin plugin;

    Listeners(DedsafioPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler
    public void onWorld(WorldLoadEvent event) {
        plugin.applyRules(event.getWorld());
    }

    @EventHandler
    public void onJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        State.Record record = plugin.state().get(player);
        plugin.game().applyTeam(player);
        if (!record.book) {
            plugin.items().giveRules(player);
            record.book = true;
            player.sendMessage(ChatColor.GOLD + "DEDsafío 4. Lee el libro. Si caes, una cuchara o el Gulag.");
            Location camp = plugin.arenas().campStand();
            if (camp != null && record.status == State.Status.VIVO) {
                player.setRespawnLocation(camp, true);
            }
            plugin.state().save();
        }
        Bukkit.getScheduler().runTask(plugin, () -> place(player));
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        plugin.game().onQuit(event.getPlayer());
    }

    @EventHandler
    public void onDeath(org.bukkit.event.entity.PlayerDeathEvent event) {
        if (event.isCancelled()) {
            return;
        }
        Player player = event.getPlayer();
        plugin.game().rememberDeath(player);
        State.Record record = plugin.state().get(player);
        if (record.status == State.Status.ELIMINADO) {
            return;
        }
        if (plugin.state().isGulagFighter(player.getUniqueId())) {
            plugin.game().eliminate(player);
            return;
        }
        if (plugin.state().isJuicioFighter(player.getUniqueId())) {
            plugin.game().juicioLose(player);
            return;
        }
        plugin.game().fall(player);
    }

    @EventHandler
    public void onRespawn(PlayerRespawnEvent event) {
        Player player = event.getPlayer();
        Location death = plugin.game().takeDeath(player.getUniqueId());
        if (death != null && death.getWorld() != null) {
            event.setRespawnLocation(death);
        }
        Bukkit.getScheduler().runTask(plugin, () -> plugin.game().afterRespawn(player));
    }

    @EventHandler
    public void onMove(PlayerMoveEvent event) {
        if (event.getTo() == null) {
            return;
        }
        if (event.getFrom().getBlockX() == event.getTo().getBlockX()
                && event.getFrom().getBlockY() == event.getTo().getBlockY()
                && event.getFrom().getBlockZ() == event.getTo().getBlockZ()) {
            return;
        }
        plugin.game().guard(event.getPlayer());
    }

    @EventHandler
    public void onDamage(EntityDamageEvent event) {
        if (!(event.getEntity() instanceof Player player)) {
            return;
        }
        State.Record record = plugin.state().peek(player.getUniqueId());
        if (record == null) {
            return;
        }
        if (record.status == State.Status.ELIMINADO) {
            event.setCancelled(true);
            return;
        }
        if (record.status == State.Status.CAIDO && !plugin.state().isGulagFighter(player.getUniqueId())) {
            event.setCancelled(true);
        }
    }

    @EventHandler
    public void onPvp(EntityDamageByEntityEvent event) {
        if (!(event.getEntity() instanceof Player victim)) {
            return;
        }
        Player attacker = attacker(event.getDamager());
        if (attacker == null) {
            return;
        }
        State state = plugin.state();
        boolean duel = state.juicioActive && state.isJuicioFighter(victim.getUniqueId()) && state.isJuicioFighter(attacker.getUniqueId());
        if (duel) {
            event.setCancelled(false);
            return;
        }
        event.setCancelled(true);
    }

    @EventHandler
    public void onInteract(PlayerInteractEvent event) {
        if (event.getHand() != EquipmentSlot.HAND || !event.getAction().isRightClick()) {
            return;
        }
        ItemStack item = event.getItem();
        if (plugin.items().isSpoon(item)) {
            event.setCancelled(true);
            event.setUseItemInHand(Event.Result.DENY);
            useSpoon(event.getPlayer(), item);
            return;
        }
        String action = plugin.items().action(item);
        if (action == null) {
            return;
        }
        event.setCancelled(true);
        event.setUseItemInHand(Event.Result.DENY);
        if (!event.getPlayer().hasPermission("dedsafio.admin")) {
            event.getPlayer().sendMessage(ChatColor.RED + "Esa vara es del admin.");
            return;
        }
        runAction(event.getPlayer(), action);
    }

    @EventHandler
    public void onPickup(EntityPickupItemEvent event) {
        if (!(event.getEntity() instanceof Player player)) {
            return;
        }
        ItemStack stack = event.getItem().getItemStack();
        if (stack.getType() != Material.ANCIENT_DEBRIS) {
            return;
        }
        if (plugin.state().get(player).status != State.Status.VIVO) {
            return;
        }
        if (ThreadLocalRandom.current().nextInt(100) >= 25) {
            return;
        }
        plugin.items().giveSpoon(player, 1);
        player.sendMessage(ChatColor.GOLD + "Entre los escombros antiguos había una cuchara.");
    }

    @EventHandler
    public void onEntityDeath(EntityDeathEvent event) {
        if (event.getEntity() instanceof Player) {
            return;
        }
        plugin.game().onBossDeath(event.getEntity());
    }

    private void place(Player player) {
        State.Record record = plugin.state().get(player);
        if (record.status == State.Status.ELIMINADO) {
            player.setGameMode(GameMode.SPECTATOR);
            Location watch = plugin.arenas().campSpectator();
            if (watch != null) {
                player.teleport(watch);
            }
            player.sendMessage(ChatColor.DARK_RED + "Estás eliminado. Solo un admin puede perdonar la partida.");
            return;
        }
        if (record.status == State.Status.CAIDO) {
            player.setGameMode(GameMode.ADVENTURE);
            Location lobby = plugin.arenas().lobby();
            if (lobby != null) {
                player.teleport(lobby);
            }
            player.sendMessage(ChatColor.RED + "Sigues caído. /gulag o espera una cuchara.");
        }
    }

    private void useSpoon(Player player, ItemStack item) {
        State.Record record = plugin.state().get(player);
        if (record.status != State.Status.VIVO) {
            player.sendMessage(ChatColor.GRAY + "Quien está caído no usa la cuchara.");
            return;
        }
        Player target = plugin.game().nearestFallen(player);
        if (target == null) {
            player.sendMessage(ChatColor.GRAY + "No hay nadie esperando una cuchara.");
            return;
        }
        if (item.getAmount() <= 1) {
            player.getInventory().setItemInMainHand(null);
        } else {
            item.setAmount(item.getAmount() - 1);
        }
        plugin.game().revive(target, player);
    }

    private void runAction(Player player, String action) {
        switch (action) {
            case "ruleta" -> plugin.game().girar();
            case "rayo" -> plugin.game().rayoStart();
            case "eclipse" -> plugin.game().eclipseStart();
            case "qumara" -> plugin.game().qumaraSummon();
            case "juicio" -> plugin.game().openJuicio();
            case "dia" -> plugin.game().nuevoDia();
            case "cuchara" -> {
                plugin.items().giveSpoon(player, 1);
                player.sendMessage(ChatColor.GOLD + "Cuchara lista.");
            }
            case "campamento" -> {
                if (plugin.arenas().buildCamp(player)) {
                    player.sendMessage(ChatColor.GREEN + "Campamento listo. El búnker está 28 bloques al sur. El spawn quedó al lado de la fogata.");
                } else {
                    player.sendMessage(ChatColor.RED + "No se pudo construir el campamento.");
                }
            }
            default -> player.sendMessage(ChatColor.GRAY + "Esa vara no hace nada.");
        }
    }

    private Player attacker(Entity damager) {
        if (damager instanceof Player player) {
            return player;
        }
        if (damager instanceof Projectile projectile) {
            ProjectileSource source = projectile.getShooter();
            if (source instanceof Player player) {
                return player;
            }
        }
        return null;
    }
}
