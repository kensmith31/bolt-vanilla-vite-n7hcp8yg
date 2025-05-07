@@ .. @@
   const getSubmissionSource = (userRole) => {
     const roleMap = {
       'admin': 'adjuster',
       'desk_adjuster': 'adjuster',
       'field_adjuster': 'field_adjuster',
       'policyholder': 'policyholder'
     };
-    return roleMap[userRole] || 'adjuster';
+    return roleMap[userRole?.name] || 'adjuster';
   };