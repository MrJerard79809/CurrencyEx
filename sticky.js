    document.addEventListener('DOMContentLoaded', function() {
      const statsPanel = document.getElementById('statsPanel');
      
      if (!statsPanel) return;
      
      const statsPanelOffsetTop = statsPanel.offsetTop;
      
      function handleScroll() {
       
        if (window.pageYOffset >= statsPanelOffsetTop) {
        
          statsPanel.classList.add('sticky');
        } else {
          
          statsPanel.classList.remove('sticky');
        }
      }
      
      window.addEventListener('scroll', handleScroll);
      
      handleScroll();
      
      document.getElementById('year').textContent = new Date().getFullYear();
      
    });
 