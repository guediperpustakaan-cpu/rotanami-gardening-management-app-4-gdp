"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Button, Card, ErrorNote, Field, InfoNote, Input } from "@/components/ui";
import { useToast } from "@/components/ui";

type NilaiDaftar = { name: string; email: string; password: string };

export default function DaftarPage() {
  const router = useRouter();
  const toast = useToast();
  const [pesan, setPesan] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NilaiDaftar>({
    resolver: zodResolver(registerSchema) as unknown as Resolver<NilaiDaftar>,
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(data: NilaiDaftar) {
    setPesan(null);
    try {
      await api("/auth/daftar", { method: "POST", body: data });
      toast.push("Akun berhasil dibuat. Silakan buat kebun pertama Anda.", "sukses");
      router.push("/");
      router.refresh();
    } catch (error) {
      setPesan(error instanceof Error ? error.message : "Gagal membuat akun. Coba lagi.");
    }
  }

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-bold">Buat akun Rotanami</h1>
      <p className="mt-1 text-sm text-soil-600">
        Akun dipakai untuk memisahkan data kebun Anda dari pengguna lain. Tidak ada fitur berbayar atau iklan.
      </p>

      {pesan ? <ErrorNote className="mt-4">{pesan}</ErrorNote> : null}

      <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Nama Anda" htmlFor="name" required error={errors.name?.message} hint="Contoh: Kebun Bu Sari">
          <Input id="name" autoComplete="name" placeholder="Nama yang tampil di aplikasi" invalid={Boolean(errors.name)} {...register("name")} />
        </Field>
        <Field label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="nama@email.com" invalid={Boolean(errors.email)} {...register("email")} />
        </Field>
        <Field label="Kata sandi" htmlFor="password" required error={errors.password?.message} hint="Minimal 8 karakter. Simpan di tempat aman.">
          <Input id="password" type="password" autoComplete="new-password" placeholder="Minimal 8 karakter" invalid={Boolean(errors.password)} {...register("password")} />
        </Field>
        <Button type="submit" size="lg" full loading={isSubmitting}>
          Daftar
        </Button>
      </form>

      <InfoNote className="mt-5">
        Autentikasi memakai sesi sisi server (cookie HttpOnly) dan hash kata sandi scrypt. Token tidak disimpan di
        localStorage.
      </InfoNote>

      <p className="mt-5 text-center text-sm text-soil-600">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-semibold text-moss-700 underline decoration-moss-300 underline-offset-2">
          Masuk di sini
        </Link>
        {" · "}
        <Link href="/masuk" className="font-semibold text-moss-700 underline decoration-moss-300 underline-offset-2">
          Pakai akun contoh
        </Link>
      </p>
    </Card>
  );
}
