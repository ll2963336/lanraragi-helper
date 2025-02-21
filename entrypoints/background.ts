export default defineBackground(() => {
  // 监听来自popup的消息
  // 修改消息监听器
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'checkServer') {
      // 使用 Promise 处理异步操作
      handleServerCheck(message.data)
        .then(response => {
          sendResponse(response);
        })
        .catch(error => {
          sendResponse({ ok: false, error: error.message });
        });
      return true; // 保持消息通道开启
    } else if (message.type === 'deployServer') {
      handleServerDeploy(message.data)
        .then(response => {
          sendResponse(response);
        })
        .catch(error => {
          sendResponse({ ok: false, error: error.message });
        });
      return true;
    }
  });

  // 处理服务器检查
  async function handleServerCheck({ url, port, token }: { url: string; port: number; token?: string }) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      if (token) {
        const base64Token = btoa(token);
        headers['Authorization'] = `Bearer ${base64Token}`;
      }

      const response = await fetch(`${url}:${port}/api/info`, {
        headers
      });

      // 设置图标状态
      chrome.action.setBadgeText({
        text: response.ok ? '✓' : '✗'
      });
      chrome.action.setBadgeBackgroundColor({
        color: response.ok ? '#4CAF50' : '#F44336'
      });

      // 保存连接状态
      await chrome.storage.local.set({
        connectionStatus: response.ok ? 'connected' : 'disconnected',
        lastStatusCode: response.status
      });

      return {
        status: response.status,
        ok: response.ok
      };
    } catch (error: Error | any) {
      // 保存错误状态
      await chrome.storage.local.set({
        connectionStatus: 'disconnected',
        lastStatusCode: 0
      });

      return {
        status: 0,
        ok: false,
        error: error.message
      };
    }
  }

  // 处理服务器部署
  async function handleServerDeploy({ url, port, token }: { url: string; port: number; token?: string }) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      if (token) {
        const base64Token = btoa(token);
        headers['Authorization'] = `Bearer ${base64Token}`;
      }

      const response = await fetch(`${url}:${port}/api/info`, {
        method: 'POST',
        headers
      });

      return {
        status: response.status,
        ok: response.ok
      };
    } catch (error: Error | any) {
      return {
        status: 0,
        ok: false,
        error: error.message
      };
    }
  }

  // 定时检查服务器状态
  async function checkServerStatus() {
    try {
      const config = await chrome.storage.local.get(['serverUrl', 'serverPort', 'serverToken']);
      if (config.serverUrl && config.serverPort) {
        const result = await handleServerCheck({
          url: config.serverUrl,
          port: config.serverPort,
          token: config.serverToken
        });

        // 广播状态变化
        chrome.runtime.sendMessage({
          type: 'statusUpdate',
          data: {
            status: result.ok ? 'connected' : 'disconnected',
            code: result.status
          }
        });
      }
    } catch (error) {
      console.error('Background check failed:', error);
    }
  }

  // 每5分钟检查一次服务器状态
  setInterval(checkServerStatus, 5 * 60 * 1000);
  // 初始检查
  checkServerStatus();

  // 监听标签页更新
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      const url = tab.url;
      if (url.match(/^https?:\/\/(e-hentai|exhentai)\.org/)) {
        // 向页面注入内容脚本
        chrome.scripting.executeScript({
          target: { tabId },
          func: extractGalleryInfo
        });
      }
    }
  });

  // 提取画廊信息的函数
  function extractGalleryInfo() {
    const newItems = document.querySelectorAll('.itg.glte > tbody > tr');
    const galleryData = Array.from(newItems).map(item => {
      const link = item.querySelector('a')?.href?.replace(/^https?:\/\//, '') || '';
      const title = item.querySelector('.glink')?.textContent || '';
      
      return {
        item,
        link,
        title
      };
    });

    // 发送数据到background
    chrome.runtime.sendMessage({
      type: 'galleryData',
      data: galleryData
    });
  }

  // 处理搜索请求
  async function searchArchive(searchQuery: string, config: any) {
    try {
      const response = await fetch(
        `${config.serverUrl}:${config.serverPort}/api/search?filter=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${btoa(config.serverToken)}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.data as any[];
      }
      return [];
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  // 处理标题正则
  function cleanTitle(title: string) {
    return title.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
  }

  // 监听来自content script的数据
  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'galleryData' && sender.tab?.id) {
      const config = await chrome.storage.local.get(['serverUrl', 'serverPort', 'serverToken']);
      if (!config.serverUrl || !config.serverPort || !config.serverToken) {
        console.error('Missing server configuration');
        return;
      }

      console.log('Processing gallery data:', message.data);

      for (const gallery of message.data) {
        try {
          // 步骤0：如果link或标题为空，跳过
          if (!gallery.link || !gallery.title) {
            console.log('Skipping empty link or title:', gallery);
            continue;
          }
          let data: any[]
          // 步骤1：通过link搜索
          data = await searchArchive(gallery.link, config);
          if (data.length > 0) {
            await chrome.tabs.sendMessage(sender.tab.id, {
              type: 'addMark',
              domId: gallery.domId,
              link: gallery.link,
              mark: '✅',
              title: data[0].title,
            });
            continue;
          }

          // 步骤2：通过完整标题搜索
          data = await searchArchive(gallery.title, config);
          if (data.length > 0) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: 'addMark',
              domId: gallery.domId,
              link: gallery.link,
              mark: '✅',
              title: data[0].title
            });
            continue;
          }

          // 步骤3：通过处理后的标题搜索
          const cleanedTitle = cleanTitle(gallery.title);
          data = await searchArchive(cleanedTitle, config);
          if (data.length > 0) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: 'addMark',
              domId: gallery.domId,
              link: gallery.link,
              mark: '⚠️',
              title: data[0].title
            });
            continue;
          }

          // 步骤4：未找到匹配
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'addMark',
            domId: gallery.domId,
            link: gallery.link,
            mark: '❌',
            title: ''
          });
        } catch (error) {
          console.error('Error processing gallery:', error);
        }
      }
      sendResponse({ success: true });
    }
    return true;
  });
});
