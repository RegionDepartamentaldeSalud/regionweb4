-- Add status column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create blacklist table
CREATE TABLE IF NOT EXISTS blacklisted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  reason text,
  created_at timestamptz DEFAULT now(),
  rejected_by uuid REFERENCES profiles(id) NOT NULL
);

-- Enable RLS on blacklist
ALTER TABLE blacklisted_users ENABLE ROW LEVEL SECURITY;

-- Update admin role for AP1
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'AP1';

-- Create policies for blacklisted_users
CREATE POLICY "Only admins can view blacklisted users"
  ON blacklisted_users FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can add to blacklist"
  ON blacklisted_users FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Update user registration trigger to check blacklist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Check if email is blacklisted
  IF EXISTS (
    SELECT 1 FROM blacklisted_users 
    WHERE email = new.email
  ) THEN
    RAISE EXCEPTION 'This email is not allowed to register';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'user',
    'pending'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notifications table for admin alerts
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_notifications
CREATE POLICY "Only admins can view notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create trigger for new user notifications
CREATE OR REPLACE FUNCTION notify_admin_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO admin_notifications (type, user_id)
  VALUES ('new_user', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_user_notification
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_user();