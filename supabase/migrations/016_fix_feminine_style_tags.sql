-- Fix incorrectly tagged neutral items that are visually feminine garments.
-- These items were showing in the wardrobe picker when Masculine style was selected.
update public.svg_clothes
set style = 'feminine', updated_at = now()
where id in (
  'tops-neutral-tank-top',   -- 019-tank-top.svg: pink tank top
  'tops-neutral-clothing',   -- 026-clothing.svg: red dress
  'tops-neutral-clothes'     -- 018-clothes.svg: women's cut top
);
