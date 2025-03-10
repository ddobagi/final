"use client";

// react hook
import { useEffect, useState } from "react";

// next.js 
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// firebase 
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";

// shadcn
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// lucide-react 
import { ThumbsUp, ArrowLeft, Heart } from "lucide-react";

// export default: 다른 곳에서 import 할 수 있는 함수형 컴포넌트를 정의 
export default function ReplyDetail() {

  // URL에서 firstSlug와 commentId 가져오기
  const { firstSlug} = useParams(); 

  // useRouter(): 페이지 이동을 관리하는 hook 
  const router = useRouter();

  // useState() : react에서 상태를 관리하는 hook 
  const [user, setUser] = useState(null);
  const [reply, setReply] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [essay, setEssay] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(1);
  const [userEmail, setUserEmail] = useState("");
  const [previousPage, setPreviousPage] = useState(`/dashboard/${firstSlug}`);

  // ✅ 하위 동적 라우팅 페이지에서는 isOn을 무조건 true로 설정
  const [isOn, setIsOn] = useState(true);

  // useEffect: 로그인한 사용자 정보 가져오기
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserEmail(currentUser.email);
        setLoading(true);
        console.log(firstSlug);
      } else {
        console.log("❌ 로그인되지 않음");
        router.push("/");
        setLoading(false);
        setUserEmail("");
      }
    });

    return () => unsubscribe();
  }, [firstSlug, router]);

  return (
    <p>{firstSlug}</p>
  )
}