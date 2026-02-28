-- ==========================================
-- CODE SIXTY-FOUR: MASTER DATABASE SCHEMA
-- ==========================================

-- ------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------
-- 2. TABLE CREATION
-- ------------------------------------------

-- Profiles (Extends Supabase's built-in auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leagues (The Tournament Pool Group)
CREATE TABLE public.leagues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE,
  status TEXT DEFAULT 'pre_draft' CHECK (status IN ('pre_draft', 'drafting', 'in_progress', 'completed')),
  current_pick INT DEFAULT 1,
  max_members INTEGER DEFAULT 8,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- League Members (Junction table linking friends to a league)
CREATE TABLE public.league_members (
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  draft_position INT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (league_id, user_id)
);

-- Teams (The 64 Teams)
CREATE TABLE public.teams (
  id INT PRIMARY KEY, 
  name TEXT NOT NULL,
  seed INT NOT NULL CHECK (seed BETWEEN 1 AND 16),
  region TEXT NOT NULL,
  wins INTEGER DEFAULT 0,
  is_eliminated BOOLEAN DEFAULT false
);

-- Games (The Tournament Bracket Structure)
CREATE TABLE public.games (
  id INT PRIMARY KEY, 
  round INT NOT NULL CHECK (round BETWEEN 1 AND 6),
  team1_id INT REFERENCES public.teams(id),
  team2_id INT REFERENCES public.teams(id),
  team1_score INT,
  team2_score INT,
  winner_id INT REFERENCES public.teams(id),
  is_completed BOOLEAN DEFAULT false,
  next_game_id INT REFERENCES public.games(id),
  next_game_team_slot INT -- 1 = Winner becomes team1, 2 = Winner becomes team2
);

-- Draft Picks (Mapping users to their drafted teams within a league)
CREATE TABLE public.draft_picks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  team_id INT REFERENCES public.teams(id) NOT NULL,
  pick_number INT,
  drafted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (league_id, team_id) 
);

-- ------------------------------------------
-- 3. FUNCTIONS & TRIGGERS
-- ------------------------------------------

-- Auto-create user profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, SPLIT_PART(NEW.email, '@', 1));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enforce League Member Capacity
CREATE OR REPLACE FUNCTION check_league_capacity() 
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.league_members WHERE league_id = NEW.league_id) >= 
     (SELECT max_members FROM public.leagues WHERE id = NEW.league_id) THEN
    RAISE EXCEPTION 'League has reached its maximum capacity';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_members
  BEFORE INSERT ON public.league_members
  FOR EACH ROW EXECUTE FUNCTION check_league_capacity();

-- ------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, User can update/insert their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Leagues: Read for auth users, Insert for self, Update for auth users (clock progression)
CREATE POLICY "Authenticated users can view leagues" ON public.leagues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create leagues" ON public.leagues FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Allow updates to leagues" ON public.leagues FOR UPDATE TO authenticated USING (true);

-- League Members: Read for auth users, Insert for self, Update for commissioner
CREATE POLICY "Users can view their league memberships" ON public.league_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join a league" ON public.league_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Commissioners can update members" ON public.league_members FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.leagues WHERE leagues.id = league_members.league_id AND leagues.created_by = auth.uid())
);

-- Teams & Games: Public Read, Temp Public Update for Games
CREATE POLICY "Allow public read access to teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access to games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Allow public updates to games" ON public.games FOR UPDATE USING (true);

-- Draft Picks: Read for auth users, Temp Public Insert for testing
CREATE POLICY "Allow read draft picks" ON public.draft_picks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow public insert to draft_picks" ON public.draft_picks FOR INSERT WITH CHECK (true);

-- ------------------------------------------
-- 5. REALTIME SUBSCRIPTIONS
-- ------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.leagues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_picks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;

-- ------------------------------------------
-- 6. DATA SEEDING (TEAMS & BRACKET)
-- ------------------------------------------

-- Populate 64 Tournament Teams
DO $$
DECLARE
    r TEXT;
    s INT;
    team_id INT := 1;
    regions TEXT[] := ARRAY['East', 'West', 'South', 'Midwest'];
BEGIN
    FOREACH r IN ARRAY regions LOOP
        FOR s IN 1..16 LOOP
            INSERT INTO public.teams (id, name, seed, region)
            VALUES (team_id, r || ' Seed ' || s, s, r);
            team_id := team_id + 1;
        END LOOP;
    END LOOP;
END $$;

-- Generate 63 Games & Round 1 Matchups
DO $$
DECLARE
    g INT;
    next_g INT;
    r INT;
    team_offset INT;
    matchups INT[] := ARRAY[1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];
BEGIN
    -- 1. Insert Round 1: Games 1-32
    FOR g IN 1..32 LOOP
        next_g := 32 + CEIL(g / 2.0);
        
        -- Determine Region (0=East, 1=West, 2=South, 3=Midwest) based on game number
        r := FLOOR((g - 1) / 8);
        team_offset := r * 16;
        
        -- Assign the standard 1v16, 8v9 matchups
        INSERT INTO public.games (id, round, next_game_id, team1_id, team2_id) 
        VALUES (
            g, 1, next_g, 
            team_offset + matchups[(((g - 1) % 8 + 1) * 2) - 1], 
            team_offset + matchups[((g - 1) % 8 + 1) * 2]
        );
    END LOOP;

    -- 2. Insert Round 2: Games 33-48
    FOR g IN 33..48 LOOP
        next_g := 48 + CEIL((g - 32) / 2.0);
        INSERT INTO public.games (id, round, next_game_id) VALUES (g, 2, next_g);
    END LOOP;

    -- 3. Insert Round 3 (Sweet 16): Games 49-56
    FOR g IN 49..56 LOOP
        next_g := 56 + CEIL((g - 48) / 2.0);
        INSERT INTO public.games (id, round, next_game_id) VALUES (g, 3, next_g);
    END LOOP;

    -- 4. Insert Round 4 (Elite 8): Games 57-60
    FOR g IN 57..60 LOOP
        next_g := 60 + CEIL((g - 56) / 2.0);
        INSERT INTO public.games (id, round, next_game_id) VALUES (g, 4, next_g);
    END LOOP;

    -- 5. Insert Round 5 (Final 4): Games 61-62
    FOR g IN 61..62 LOOP
        INSERT INTO public.games (id, round, next_game_id) VALUES (g, 5, 63);
    END LOOP;

    -- 6. Insert Round 6 (Championship): Game 63
    INSERT INTO public.games (id, round, next_game_id) VALUES (63, 6, NULL);
END $$;

-- Add a season_year column, defaulting to the current tournament year
ALTER TABLE public.leagues ADD COLUMN season_year INT DEFAULT 2026;
ALTER TABLE public.teams ADD COLUMN season_year INT DEFAULT 2026;
ALTER TABLE public.games ADD COLUMN season_year INT DEFAULT 2026;