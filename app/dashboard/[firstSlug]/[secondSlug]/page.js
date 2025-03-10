"use client";

// react hook
import { useEffect, useState } from "react";

// next.js 
import { useParams, useRouter } from "next/navigation";

// firebase 
import { auth, db } from "@/lib/firebase";

// export default: 다른 곳에서 import 할 수 있는 함수형 컴포넌트를 정의 
export default function SecondSlugPage() {

  // URL에서 firstSlug와 commentId 가져오기
  const { firstSlug, secondSlug } = useParams(); 

  // useRouter(): 페이지 이동을 관리하는 hook 
  const router = useRouter();
  console.log(router.pathname)

  // useState() : react에서 상태를 관리하는 hook 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  // useEffect: 로그인한 사용자 정보 가져오기
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserEmail(currentUser.email);
        setLoading(true);
        console.log(firstSlug, secondSlug);
      } else {
        console.log("❌ 로그인되지 않음");
        router.push("/");
        setLoading(false);
        setUserEmail("");
      }
    });

    return () => unsubscribe();
  }, [firstSlug, secondSlug, router]);

  return (
    <p>제발!</p>
  )
}