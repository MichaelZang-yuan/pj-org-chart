"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { login, signup, enterGuestMode, error, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignup) {
      await signup(email, password);
    } else {
      await login(email, password);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#1E3A5F]">PJ Org Chart</h1>
          <p className="mt-2 text-sm text-gray-500">
            {isSignup ? "创建账号" : "登录账号"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm"
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
              placeholder="your@email.com"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
              placeholder="至少6位"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#1E3A5F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4d7a] transition-colors disabled:opacity-50"
          >
            {loading ? "处理中..." : isSignup ? "注册" : "登录"}
          </button>

          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="mt-3 w-full text-center text-sm text-[#1E3A5F] hover:underline"
          >
            {isSignup ? "已有账号？去登录" : "没有账号？去注册"}
          </button>
        </form>

        <button
          onClick={enterGuestMode}
          className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          游客模式（无需登录）
        </button>
      </div>
    </main>
  );
}
