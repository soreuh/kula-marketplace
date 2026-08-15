-- ============================================================
-- 024 — products.file_pages + file_bytes ("what you get" row)
-- Run AFTER 023, in: Supabase Dashboard → SQL Editor.
-- ⚠️ DEPLOY ORDER (reverse of 023): run THIS FIRST, then push the
-- code — the new upload dialog writes these columns, so deploying
-- code against an un-migrated DB fails every listing save. Old code
-- against the new columns is harmless.
--
-- WHY: every comparable (TpT, Etsy, Gumroad) discloses the file
-- before purchase — format, length, size. Both values are captured
-- AUTOMATICALLY in the upload dialog (file.size off the File object;
-- page count from the pdf.js doc that already renders the blurred
-- preview) — sellers never type them. File TYPE needs no column at
-- all: it derives from file_path's extension, so even pre-024 rows
-- show "PDF". NULL = predates 024 or a format we don't count pages
-- for (PPT/PPTX today) — the UI renders whatever parts exist.
--
-- Not money columns, sellers may write them on their own rows like
-- any listing metadata — no 008-style guard needed. Values come off
-- the actual uploaded file in code, same trust class as duration or
-- level (and unlike those, not hand-typed).
-- ============================================================

alter table public.products
  add column if not exists file_pages int,
  add column if not exists file_bytes bigint;

comment on column public.products.file_pages is
  'Page count of the sale file, read from pdf.js at upload (PDFs only; NULL for PPT/PPTX or pre-024 rows). Auto-captured, never typed.';

comment on column public.products.file_bytes is
  'Size in bytes of the current sale file, from the File object at upload. NULL = predates 024. Auto-captured, never typed.';
