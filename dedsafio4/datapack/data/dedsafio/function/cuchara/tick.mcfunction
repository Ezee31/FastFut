execute as @a[scores={uso_cuchara=1..}] run function dedsafio:cuchara/intentar
scoreboard players set @a uso_cuchara 0
execute as @a[scores={uso_admin=1..}] run function dedsafio:admin/usar
scoreboard players set @a uso_admin 0
