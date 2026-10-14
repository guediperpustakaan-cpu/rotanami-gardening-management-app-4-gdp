"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/schemas";
import type { FarmDto, SessionUser } from "@/lib/types";
import { api } from "@/lib/api";
import { Button, Card, ErrorNote, Field, InfoNote, Input, useToast } from "@/components/ui";

type NilaiMasuk = { email: string; password: string };

export default function MasukPage() {
  const router = useRouter();
  const toast = useToast();
  const [pesan, setPesan] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NilaiMasuk>({
    resolver: zodResolver(loginSchema) as unknown as Resolver<NilaiMasuk>,
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: NilaiMasuk) {
    setPesan(null);
    try {
      const result = await api<{ user: SessionUser; farms: FarmDto[] }>("/auth/masuk", { method: "POST", body: data });
      toast.push(`Selamat datang kembali, ${result.user.name}.`, "sukses");
      router.push("/");
      router.refresh();
    } catch (error) {
      setPesan(error instanceof Error ? error.message : "Gagal masuk. Coba lagi.");
    }
  }

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-bold">Masuk ke kebun Anda</h1>
      <p className="mt-1 text-sm text-soil-600">
        Gunakan akun Rotanami Anda. Sesi disimpan sebagai cookie HttpOnly di peramban ini.
      </p>

      {pesan ? <ErrorNote className="mt-4">{pesan}</ErrorNote> : null}

      <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nama@email.com"
            invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </Field>
        <Field label="Kata sandi" htmlFor="password" required error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Minimal 8 karakter"
            invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </Field>
        <Button type="submit" size="lg" full loading={isSubmitting}>
          Masuk
        </Button>
      </form>

      <div className="mt-5 border-t border-soil-100 pt-4">
        <InfoNote tone="clay">
          <p className="font-semibold">Akun contoh (data contoh)</p>
          <p className="mt-0.5">
            Email <span className="font-mono">petani@contoh.rotanami</span> · kata sandi{" "}
            <span className="font-mono">rotanami-contoh</span>
          </p>
          <p className="mt-1">
            Akun ini berisi kebun, petak, riwayat tanam, dan hasil uji tanah berlabel “Data contoh” agar semua fitur
            bisa langsung dicoba. Anda bebas mengubah atau menghapusnya.
          </p>
          <Button
            type="button"
            variant="kedua"
            size="sm"
            className="mt-2"
            onClick={() => {
              setValue("email", "petani@contoh.rotanami");
              setValue("password", "rotanami-contoh");
            }}
          >
            Isi otomatis akun contoh
          </Button>
        </InfoNote>
      </div>

      <p className="mt-5 text-center text-sm text-soil-600">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-moss-700 underline decoration-moss-300 underline-offset-2">
          Daftar akun baru
        </Link>
      </p>
    </Card>
  );
}
