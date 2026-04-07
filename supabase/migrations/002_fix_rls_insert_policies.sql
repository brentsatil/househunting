-- Fix RLS policies for INSERT operations.
--
-- The original "FOR ALL USING (...)" policy may not properly apply
-- WITH CHECK for INSERT in all PostgreSQL/Supabase configurations.
-- Split into explicit per-operation policies for reliability.

-- Properties
drop policy if exists "Property access" on properties;

create policy "Property select" on properties
  for select using (
    partnership_id in (
      select id from partnerships where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Property insert" on properties
  for insert with check (
    partnership_id in (
      select id from partnerships where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Property update" on properties
  for update using (
    partnership_id in (
      select id from partnerships where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Property delete" on properties
  for delete using (
    partnership_id in (
      select id from partnerships where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

-- Interactions
drop policy if exists "Interaction access" on property_interactions;

create policy "Interaction select" on property_interactions
  for select using (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

create policy "Interaction insert" on property_interactions
  for insert with check (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

create policy "Interaction update" on property_interactions
  for update using (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

-- Comments
drop policy if exists "Comment access" on comments;

create policy "Comment select" on comments
  for select using (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

create policy "Comment insert" on comments
  for insert with check (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

-- Inspections
drop policy if exists "Inspection access" on inspections;

create policy "Inspection select" on inspections
  for select using (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

create policy "Inspection insert" on inspections
  for insert with check (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

create policy "Inspection update" on inspections
  for update using (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

-- Enrichment
drop policy if exists "Enrichment access" on enrichment_data;

create policy "Enrichment select" on enrichment_data
  for select using (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

create policy "Enrichment insert" on enrichment_data
  for insert with check (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

create policy "Enrichment update" on enrichment_data
  for update using (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );
