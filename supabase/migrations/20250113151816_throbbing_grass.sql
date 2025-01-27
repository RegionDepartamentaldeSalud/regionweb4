/*
  # Update AP1 to Admin Role
  
  1. Changes
    - Updates AP1's role to 'admin'
    - Updates AP1's status to 'approved'
*/

UPDATE profiles 
SET 
  role = 'admin',
  status = 'approved',
  updated_at = now()
WHERE email = 'AP1';