document.addEventListener('DOMContentLoaded', function() {
    // Set the initial size
    const body = document.body;
    const width = Math.max(400, body.scrollWidth);
    const height = body.scrollHeight;
    window.resizeTo(width, height);
  
    // Optional: Adjust size when content changes
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const width = Math.max(400, entry.contentRect.width);
        const height = entry.contentRect.height;
        window.resizeTo(width, height);
      }
    });
  
    resizeObserver.observe(body);
  });