-- Migration: Update character names and descriptions
-- Placeholder content only; feel free to replace these values later.

begin;

update public.characters
set
  name = case id
    when 1 then 'Nova Vale'
    when 2 then 'Iris Dawn'
    when 3 then 'Mira Sol'
    when 4 then 'Celia Frost'
    when 5 then 'Kora Vex'
    when 6 then 'Lumi Hart'
    when 7 then 'Nera Bloom'
    when 8 then 'Orin Slate'
    when 9 then 'Sera Tide'
    when 10 then 'Veda Rune'
    when 11 then 'Yara Quinn'
    else name
  end,
  description = case id
    when 1 then 'A sharp-minded leader who turns pressure into clean decisions.'
    when 2 then 'A curious analyst who notices details others usually miss.'
    when 3 then 'A lively strategist who stays calm when the pace gets intense.'
    when 4 then 'A precise defender who values timing, patience, and control.'
    when 5 then 'A fast-moving duelist who favors quick adjustments and momentum.'
    when 6 then 'A steady support specialist who keeps the team balanced.'
    when 7 then 'A thoughtful planner who builds success through layered ideas.'
    when 8 then 'A practical tactician who prefers simple plans that work well.'
    when 9 then 'A disciplined commander with a strong sense of rhythm and order.'
    when 10 then 'A focused explorer who adapts smoothly to changing situations.'
    when 11 then 'A flexible scout who blends speed, awareness, and precision.'
    else description
  end
where id between 1 and 11;

commit;