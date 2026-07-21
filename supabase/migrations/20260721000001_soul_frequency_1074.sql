-- Align Soul carrier with product colour table (1074 Hz → #EAF0FF)
update public.sound_library
set
  base_frequency_hz = 1074,
  solfeggio_intent = 'Field regeneration, higher alignment',
  tags = array['soul', 'source', 'gamma']
where chakra_key = 'soul';
