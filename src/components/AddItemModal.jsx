@@ .. @@
   const getSubmissionSource = (userRole) => {
     const roleMap = {
       'admin': 'adjuster',
       'desk_adjuster': 'adjuster',
       'field_adjuster': 'field_adjuster',
       'policyholder': 'policyholder'
     };
     return roleMap[userRole?.name] || 'adjuster';
   };
   
   // Helper function to get user's full name for change history
   const getUserFullName = (user) => {
     if (!user) return 'Unknown User';
     return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';
   };