import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch"; // 添加 Switch 组件导入

type ConnectionStatus = "connected" | "disconnected" | "connecting";
type AlertType = "404" | "401" | null;

function App() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [url, setUrl] = useState("");
  const [port, setPort] = useState("");
  const [token, setToken] = useState("");
  const [alertType, setAlertType] = useState<AlertType>(null);
  const [autoSelectSearch, setAutoSelectSearch] = useState(false); // 添加新的状态

  // 加载保存的配置
  useEffect(() => {
    // 监听来自 background 的状态更新
    const handleStatusUpdate = (message: any) => {
      console.log(message)
      if (message.type === 'statusUpdate') {
        setStatus(message.data.status);
        if (message.data.code === 401) {
          setAlertType('401');
        } else if (message.data.code === 404) {
          setAlertType('404');
        } else {
          setAlertType(null);
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleStatusUpdate);

    const loadSavedConfig = async () => {
      const result = await chrome.storage.local.get([
        'serverUrl', 
        'serverPort', 
        'serverToken',
        'connectionStatus',
        'lastStatusCode',
        'autoSelectSearch' // 添加新的配置项
      ]);
      
      if (result.serverUrl) setUrl(result.serverUrl);
      if (result.serverPort) setPort(result.serverPort);
      if (result.serverToken) setToken(result.serverToken);
      if (result.connectionStatus) setStatus(result.connectionStatus);
      if (result.autoSelectSearch !== undefined) setAutoSelectSearch(result.autoSelectSearch);
      
      // 设置告警状态
      if (result.lastStatusCode === 401) {
        setAlertType('401');
      } else if (result.lastStatusCode === 404) {
        setAlertType('404');
      }
    };
    loadSavedConfig();

    // 清理监听器
    return () => {
      chrome.runtime.onMessage.removeListener(handleStatusUpdate);
    };
  }, []);

  const getStatusIcon = (status: ConnectionStatus) => {
    if (status === "connected") {
      return <span className="ml-2 text-green-500">✅</span>;
    } else if (status === "disconnected") {
      return <span className="ml-2 text-red-500">❌</span>;
    } else {
      return <span className="ml-2 text-yellow-500">🔄</span>;
    }
  };

  // 保存配置
  const saveConfig = async (type: 'url' | 'port' | 'token', value: string) => {
    const key = type === 'url' ? 'serverUrl' : type === 'port' ? 'serverPort' : 'serverToken';
    await chrome.storage.local.set({ [key]: value });
  };

  const handleInputChange = (type: 'url' | 'port' | 'token', value: string) => {
    setAlertType(null);
    if (type === 'url') setUrl(value);
    else if (type === 'port') setPort(value);
    else setToken(value);
    saveConfig(type, value);
  };

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) {
      const base64Token = btoa(token);
      headers['Authorization'] = `Bearer ${base64Token}`;
    }
    return headers;
  };

  const handleCheck = async () => {
    if (!url || !port) {
      alert("请输入完整的服务器信息");
      return;
    }

    setStatus("connecting");
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'checkServer',
        data: { url, port, token }
      });

      if (response.ok) {
        setStatus("connected");
        setAlertType(null);
      } else if (response.status === 404) {
        setStatus("disconnected");
        setAlertType("404");
      } else if (response.status === 401) {
        setStatus("disconnected");
        setAlertType("401");
      } else {
        setStatus("disconnected");
        setAlertType(null);
      }
    } catch (error) {
      setStatus("disconnected");
      setAlertType(null);
    }
  };

  const handleDeploy = async () => {
    if (status !== "connected") {
      alert("请先确保服务器连接正常");
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'deployServer',
        data: { url, port, token }
      });

      if (response.ok) {
        alert("部署成功！");
      } else if (response.status === 401) {
        setAlertType("401");
      } else {
        alert("部署失败，请重试");
      }
    } catch (error) {
      alert("部署过程发生错误");
    }
  };

  // 处理 toggle 变化
  const handleToggleChange = async (checked: boolean) => {
    setAutoSelectSearch(checked);
    await chrome.storage.local.set({ autoSelectSearch: checked });
  };

  return (
    <div className="w-[300px] p-4 space-y-4">
      {alertType && (
        <Alert variant="destructive">
          <AlertDescription>
            {alertType === "404" ? "连接地址不正确" : "请添加 token"}
          </AlertDescription>
        </Alert>
      )}

      <div className="text-sm">
        连接状态：{status === "connected" ? "已连接" : status === "disconnected" ? "未连接" : "连接中"}
        {getStatusIcon(status)}
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">服务器地址</Label>
        <Input
          id="url"
          value={url}
          onChange={(e) => handleInputChange('url', e.target.value)}
          placeholder="请输入服务器地址"
          type="url"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="port">端口号</Label>
        <Input
          id="port"
          value={port}
          onChange={(e) => handleInputChange('port', e.target.value)}
          placeholder="请输入端口号"
          type="number"
          min="1"
          max="65535"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="token">认证令牌</Label>
        <Input
          id="token"
          value={token}
          onChange={(e) => handleInputChange('token', e.target.value)}
          placeholder="请输入认证令牌"
          type="password"
        />
      </div>

      {/* 添加 toggle 开关 */}
      <div className="flex items-center justify-between">
        <Label htmlFor="auto-select-search" className="text-sm">选中&清空搜索栏</Label>
        <Switch 
          id="auto-select-search" 
          checked={autoSelectSearch}
          onCheckedChange={handleToggleChange}
        />
      </div>

      <div className="flex space-x-4">
        <Button className="flex-1" onClick={handleCheck}>Check</Button>
        <Button className="flex-1" onClick={handleDeploy} disabled={status !== "connected"}>Deploy</Button>
      </div>
    </div>
  );
}

export default App;
