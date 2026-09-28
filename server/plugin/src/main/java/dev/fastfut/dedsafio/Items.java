package dev.fastfut.dedsafio;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.ShapedRecipe;
import org.bukkit.inventory.meta.BookMeta;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataType;

import java.util.List;
import java.util.Map;

final class Items {
    static final String SPOON = "si";
    private final DedsafioPlugin plugin;
    private final NamespacedKey spoonKey;
    private final NamespacedKey actionKey;
    private final NamespacedKey recipeKey;

    Items(DedsafioPlugin plugin) {
        this.plugin = plugin;
        this.spoonKey = new NamespacedKey(plugin, "cuchara");
        this.actionKey = new NamespacedKey(plugin, "accion");
        this.recipeKey = new NamespacedKey(plugin, "cuchara");
    }

    void registerRecipe() {
        Bukkit.removeRecipe(recipeKey);
        ShapedRecipe recipe = new ShapedRecipe(recipeKey, spoon());
        recipe.shape("E", "S", "N");
        recipe.setIngredient('E', Material.ECHO_SHARD);
        recipe.setIngredient('S', Material.GOLDEN_SHOVEL);
        recipe.setIngredient('N', Material.NETHER_STAR);
        Bukkit.addRecipe(recipe);
    }

    ItemStack spoon() {
        ItemStack item = new ItemStack(Material.WARPED_FUNGUS_ON_A_STICK);
        item.editMeta(meta -> {
            meta.setDisplayName(ChatColor.GOLD + "Cuchara de Resurrección");
            meta.setLore(List.of(
                    ChatColor.GRAY + "Click derecho: revive al caído más cercano.",
                    ChatColor.DARK_GRAY + "Primero busca a alguien de tu equipo."
            ));
            meta.setItemModel(NamespacedKey.minecraft("golden_shovel"));
            meta.setEnchantmentGlintOverride(true);
            meta.setMaxStackSize(16);
            meta.getPersistentDataContainer().set(spoonKey, PersistentDataType.STRING, SPOON);
        });
        return item;
    }

    boolean isSpoon(ItemStack item) {
        if (item == null || item.getType() != Material.WARPED_FUNGUS_ON_A_STICK || !item.hasItemMeta()) {
            return false;
        }
        ItemMeta meta = item.getItemMeta();
        return SPOON.equals(meta.getPersistentDataContainer().get(spoonKey, PersistentDataType.STRING));
    }

    ItemStack stick(String action, String name, String lore, String model) {
        ItemStack item = new ItemStack(Material.CARROT_ON_A_STICK);
        item.editMeta(meta -> {
            meta.setDisplayName(name);
            meta.setLore(List.of(ChatColor.GRAY + lore));
            meta.setItemModel(NamespacedKey.minecraft(model));
            meta.getPersistentDataContainer().set(actionKey, PersistentDataType.STRING, action);
        });
        return item;
    }

    String action(ItemStack item) {
        if (item == null || item.getType() != Material.CARROT_ON_A_STICK || !item.hasItemMeta()) {
            return null;
        }
        return item.getItemMeta().getPersistentDataContainer().get(actionKey, PersistentDataType.STRING);
    }

    void giveSpoon(Player player, int amount) {
        ItemStack item = spoon();
        item.setAmount(Math.max(1, amount));
        give(player, item);
    }

    void giveKit(Player player) {
        give(player, stick("ruleta", ChatColor.GOLD + "Ruleta", "Click: gira la ruleta", "clock"));
        give(player, stick("rayo", ChatColor.YELLOW + "Rayo", "Click: evento del rayo", "lightning_rod"));
        give(player, stick("eclipse", ChatColor.DARK_PURPLE + "Eclipse", "Click: empieza el eclipse", "black_candle"));
        give(player, stick("qumara", ChatColor.DARK_PURPLE + "Qumara", "Click: invoca al jefe", "wither_skeleton_skull"));
        give(player, stick("juicio", ChatColor.RED + "Juicio", "Click: abre el juicio", "writable_book"));
        give(player, stick("dia", ChatColor.AQUA + "Día siguiente", "Click: avanza el día y gira", "sunflower"));
        give(player, stick("cuchara", ChatColor.GOLD + "Dar cuchara", "Click: recibes una cuchara", "golden_shovel"));
        give(player, stick("campamento", ChatColor.GREEN + "Campamento", "Click: construye campamento y búnker", "campfire"));
        player.sendMessage(ChatColor.GREEN + "Kit de admin listo. Click derecho con cada vara.");
    }

    void giveRules(Player player) {
        ItemStack book = new ItemStack(Material.WRITTEN_BOOK);
        book.editMeta(BookMeta.class, meta -> {
            meta.setTitle("Reglas del DEDsafío");
            meta.setAuthor("DEDsafío");
            meta.addPage(ChatColor.GOLD + "DEDsafío 4\n\n"
                    + ChatColor.BLACK + "Si mueres, caes. Todavía no estás eliminado.\n"
                    + "Una cuchara te puede devolver.\n"
                    + "Perder el Gulag sí es definitivo.");
            meta.addPage(ChatColor.DARK_RED + "Gulag\n\n"
                    + ChatColor.BLACK + "Un Tiranosaurio Rex. Una persona a la vez.\n"
                    + "Si ganas, vuelves con el hierro.\n"
                    + "Si pierdes, o se acaba el tiempo, quedas eliminado.\n\n"
                    + "Entra con /gulag estando caído.");
            meta.addPage(ChatColor.GOLD + "Juicio\n\n"
                    + ChatColor.BLACK + "El admin lo abre. Dos vivos se anotan con /juicio.\n"
                    + "El que pierde cae al lobby. No queda eliminado.\n"
                    + "El PvP del mundo solo existe durante el Juicio.");
            meta.addPage(ChatColor.YELLOW + "Ruleta y búnker\n\n"
                    + ChatColor.BLACK + "Cada ciclo gira sola: eclipse, rayo, hambre, sin regeneración, cuchara, fantasmas, debilidad, magma, iceberg o prisa.\n\n"
                    + "Cuando caiga el rayo, métete al búnker del campamento.");
            meta.addPage(ChatColor.DARK_PURPLE + "Qumara\n\n"
                    + ChatColor.BLACK + "Es el primer jefe. No tendrá piedad.\n"
                    + "Al caer, deja una cuchara a cada vivo.\n\n"
                    + "Seis equipos: /equipo rojo, azul, verde, amarillo, naranja o morado.\n"
                    + "Los tótems siguen funcionando.");
            meta.addPage(ChatColor.DARK_GRAY + "Esto es una recreación de fans para un servidor propio.\n\n"
                    + "No es el mapa, el modpack ni el servidor de Eufonia Studio. El DEDsafío 4 oficial no publicó esos archivos.");
        });
        give(player, book);
    }

    void equipGulag(Player player) {
        player.getInventory().clear();
        player.getInventory().setHelmet(new ItemStack(Material.IRON_HELMET));
        player.getInventory().setChestplate(new ItemStack(Material.IRON_CHESTPLATE));
        player.getInventory().setLeggings(new ItemStack(Material.IRON_LEGGINGS));
        player.getInventory().setBoots(new ItemStack(Material.IRON_BOOTS));
        player.getInventory().setItemInMainHand(new ItemStack(Material.IRON_SWORD));
        player.getInventory().setItemInOffHand(new ItemStack(Material.SHIELD));
        player.getInventory().setItem(1, new ItemStack(Material.COOKED_BEEF, 16));
        player.getInventory().setItem(2, new ItemStack(Material.GOLDEN_APPLE, 2));
        player.setFoodLevel(20);
        player.setSaturation(20f);
    }

    void give(Player player, ItemStack item) {
        Map<Integer, ItemStack> leftover = player.getInventory().addItem(item);
        for (ItemStack extra : leftover.values()) {
            player.getWorld().dropItemNaturally(player.getLocation(), extra);
        }
    }

    DedsafioPlugin plugin() {
        return plugin;
    }
}
