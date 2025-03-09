// useState, useEffect 등 react hook은 클라이언트 사이드에서만 실행되므로, 클라이언트 컴포넌트임을 선언하는 것 
"use client";

// react 
import { useState, useEffect } from "react";

// next.js 
import { useRouter } from "next/navigation";
import Image from "next/image";

// firebase 
import { auth, provider } from "@/lib/firebase";
import { signInWithPopup, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";

// export default: 다른 곳에서 import 할 수 있게 함
// 다른 곳에서 import 할 수 있는 함수형 컴포넌트를 정의 
export default function Home() {

  // useState() : react에서 상태를 관리하는 hook 
  // state 정보와 setter 함수가 배열[]로 정의됨 
  const [user, setUser] = useState(null);

  // useRouter(): 페이지 이동을 관리하는 hook 
  const router = useRouter();

  // useEffect: 컴포넌트가 렌더링될 때 실행되는 react hook 
  useEffect(() => {
    
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        router.push("/dashboard"); // 로그인 후 대시보드로 이동
      }
    });

    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          setUser(result.user);
          router.push("/dashboard");
        }
      })
      .catch((error) => console.error("로그인 오류:", error));

    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    try {
      if (auth && provider) {
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      console.error("로그인 오류:", error);
    }
  };

  const handleLogout = () => {
    if (auth) {
      signOut(auth)
        .then(() => {
          setUser(null);
          alert("로그아웃 되었습니다.");
        })
        .catch((error) => console.error("❌ 로그아웃 오류:", error));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="flex items-center mb-6 space-x-3">
        <div className="w-16 h-16 px-2 py-2 bg-black rounded-full overflow-hidden border border-gray-300">
          <Image src="/deep_logo.png" alt="띱 로고" className="object-contain" />
        </div>
        <h1 className="text-4xl font-semibold font-archivo">Deep Essays</h1>
      </div>

      {/* 구분선 */}
      <div className="flex items-center w-full max-w-xs mb-6">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="px-3 text-gray-500 text-sm font-pretendard">간편로그인</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* 로그인 버튼 */}
      {user ? (
        <div className="text-center">
          <p className="mb-4">로그인한 사용자: {user.displayName} ({user.email})</p>
          <button
            onClick={handleLogout}
            className="px-5 py-2 bg-transparent text-white rounded-lg shadow-md"
          >
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          className="cursor-pointer w-12 h-12 flex items-center px-2 py-2 bg-transparent border border-gray-300 rounded-lg shadow-md hover:bg-gray-50"
        >
          <Image src="/google_logo.png" alt="Google 로고" className="object-contain" />
        </button>
      )}
    </div>
  );
}
