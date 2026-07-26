"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, startTransition, useEffect, useState } from "react";
import type { ApiError, AuthResponse, CourseScreenshot, CourseScreenshotResponse, CurrentUser, PlanCourse, PlanCourseResponse, TermPlan, TermPlanDetail, TermPlanDetailResponse, TermPlanResponse, TermPlansResponse } from "@/lib/contracts";
import { ExtractionReview } from "@/components/extraction-review";

type PageStatus = "loading" | "redirecting" | "ready" | "error";

export function PlannerShell() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [plans, setPlans] = useState<TermPlan[]>([]);
  const [activePlan, setActivePlan] = useState<TermPlanDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [planError, setPlanError] = useState("");
  const [planNotice, setPlanNotice] = useState("");
  const [courseError, setCourseError] = useState("");
  const [courseNotice, setCourseNotice] = useState("");
  const [termError, setTermError] = useState("");
  const [addCourseFields, setAddCourseFields] = useState<Record<string, string>>({});
  const [editCourseFields, setEditCourseFields] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<PageStatus>("loading");
  const [creating, setCreating] = useState(false);
  const [openingPlan, setOpeningPlan] = useState<string | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmingCourseDelete, setConfirmingCourseDelete] = useState<string | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null);
  const [courseUploadState, setCourseUploadState] = useState<Record<string, { busy: boolean; error?: string; notice?: string }>>({});
  const [removingScreenshot, setRemovingScreenshot] = useState<string | null>(null);
  const [confirmingScreenshotDelete, setConfirmingScreenshotDelete] = useState<string | null>(null);
  const [reviewingCourseId, setReviewingCourseId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorkspace() {
      try {
        const [accountResponse, plansResponse] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store", signal: controller.signal }),
          fetch("/api/plans", { cache: "no-store", signal: controller.signal }),
        ]);
        if (accountResponse.status === 401 || plansResponse.status === 401) {
          setStatus("redirecting");
          startTransition(() => router.replace("/login"));
          return;
        }

        const accountBody = await accountResponse.json().catch(() => null) as AuthResponse | ApiError | null;
        const plansBody = await plansResponse.json().catch(() => null) as TermPlansResponse | ApiError | null;
        if (!accountBody || !plansBody) throw new Error("The planning service returned an unreadable response.");
        if (!accountResponse.ok) throw new Error((accountBody as ApiError).error.message);
        if (!plansResponse.ok) throw new Error((plansBody as ApiError).error.message);

        setUser((accountBody as AuthResponse).user);
        setPlans((plansBody as TermPlansResponse).plans);
        setStatus("ready");
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") {
          setError(loadError instanceof Error ? loadError.message : "Could not load your planning workspace.");
          setStatus("error");
        }
      }
    }

    loadWorkspace();
    return () => controller.abort();
  }, [router]);

  function updateCourseCount(planId: string, change: number) {
    setPlans((current) => current.map((plan) => plan.id === planId ? { ...plan, courseCount: Math.max(0, plan.courseCount + change) } : plan));
  }

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setCreating(true);
    setError(""); setNotice(""); setPlanError(""); setPlanNotice(""); setTermError("");
    try {
      const response = await fetch("/api/plans", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ term: data.get("term") }) });
      const body = await response.json().catch(() => null) as TermPlanResponse | ApiError | null;
      if (!body) throw new Error("The planning service returned an unreadable response.");
      if (!response.ok) {
        const apiError = (body as ApiError).error;
        setTermError(apiError.fields?.term ?? "");
        setError(apiError.message);
        return;
      }
      const createdPlan = (body as TermPlanResponse).plan;
      setPlans((current) => [createdPlan, ...current]);
      form.reset();
      setNotice(`${createdPlan.term} was saved. Open it to add your courses.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not save the term plan. Try again.");
    } finally { setCreating(false); }
  }

  async function openPlan(planId: string) {
    setOpeningPlan(planId);
    setPlanError(""); setPlanNotice(""); setCourseError(""); setCourseNotice("");
    try {
      const response = await fetch(`/api/plans/${planId}`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as TermPlanDetailResponse | ApiError | null;
      if (!body) throw new Error("The planning service returned an unreadable response.");
      if (!response.ok) throw new Error((body as ApiError).error.message);
      setActivePlan((body as TermPlanDetailResponse).plan);
      setEditingCourse(null);
      setReviewingCourseId(null);
      requestAnimationFrame(() => document.getElementById("course-workspace-title")?.focus());
    } catch (openError) {
      setPlanError(openError instanceof Error ? openError.message : "Could not open the term plan.");
    } finally { setOpeningPlan(null); }
  }

  async function deletePlan(plan: TermPlan) {
    setDeleting(plan.id);
    setPlanError(""); setPlanNotice("");
    try {
      const response = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as ApiError | null;
        throw new Error(body?.error.message || "Could not delete the term plan.");
      }
      setPlans((current) => current.filter((item) => item.id !== plan.id));
      if (activePlan?.id === plan.id) setActivePlan(null);
      setConfirmingDelete(null);
      setPlanNotice(`${plan.term} was deleted.`);
      requestAnimationFrame(() => document.getElementById("plans-title")?.focus());
    } catch (deleteError) {
      setPlanError(deleteError instanceof Error ? deleteError.message : "Could not delete the term plan. Try again.");
    } finally { setDeleting(null); }
  }

  async function addCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activePlan) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSavingCourse(true);
    setCourseError(""); setCourseNotice(""); setAddCourseFields({});
    try {
      const response = await fetch(`/api/plans/${activePlan.id}/courses`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: data.get("code"), name: data.get("name") }) });
      const body = await response.json().catch(() => null) as PlanCourseResponse | ApiError | null;
      if (!body) throw new Error("The planning service returned an unreadable response.");
      if (!response.ok) {
        const apiError = (body as ApiError).error;
        setAddCourseFields(apiError.fields ?? {});
        setCourseError(apiError.message);
        return;
      }
      const course = (body as PlanCourseResponse).course;
      setActivePlan((current) => current ? { ...current, courseCount: current.courseCount + 1, courses: [...current.courses, course] } : current);
      updateCourseCount(activePlan.id, 1);
      form.reset();
      setCourseNotice(`${course.code} was added to ${activePlan.term}.`);
    } catch (addError) {
      setCourseError(addError instanceof Error ? addError.message : "Could not add the course. Try again.");
    } finally { setSavingCourse(false); }
  }

  async function updateCourse(event: FormEvent<HTMLFormElement>, course: PlanCourse) {
    event.preventDefault();
    if (!activePlan) return;
    const data = new FormData(event.currentTarget);
    setSavingCourse(true);
    setCourseError(""); setCourseNotice(""); setEditCourseFields({});
    try {
      const response = await fetch(`/api/plans/${activePlan.id}/courses/${course.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: data.get("code"), name: data.get("name") }) });
      const body = await response.json().catch(() => null) as PlanCourseResponse | ApiError | null;
      if (!body) throw new Error("The planning service returned an unreadable response.");
      if (!response.ok) {
        const apiError = (body as ApiError).error;
        setEditCourseFields(apiError.fields ?? {});
        setCourseError(apiError.message);
        return;
      }
      const updated = (body as PlanCourseResponse).course;
      setActivePlan((current) => current ? { ...current, courses: current.courses.map((item) => item.id === updated.id ? updated : item) } : current);
      setEditingCourse(null);
      setCourseNotice(`${updated.code} was updated.`);
      requestAnimationFrame(() => document.getElementById(`edit-course-${updated.id}`)?.focus());
    } catch (updateError) {
      setCourseError(updateError instanceof Error ? updateError.message : "Could not update the course. Try again.");
    } finally { setSavingCourse(false); }
  }

  async function deleteCourse(course: PlanCourse) {
    if (!activePlan) return;
    setDeletingCourse(course.id);
    setCourseError(""); setCourseNotice("");
    try {
      const response = await fetch(`/api/plans/${activePlan.id}/courses/${course.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as ApiError | null;
        throw new Error(body?.error.message || "Could not delete the course.");
      }
      setActivePlan((current) => current ? { ...current, courseCount: current.courseCount - 1, courses: current.courses.filter((item) => item.id !== course.id) } : current);
      if (reviewingCourseId === course.id) setReviewingCourseId(null);
      updateCourseCount(activePlan.id, -1);
      setConfirmingCourseDelete(null);
      setCourseNotice(`${course.code} was removed from ${activePlan.term}.`);
      requestAnimationFrame(() => document.getElementById("courses-title")?.focus());
    } catch (deleteError) {
      setCourseError(deleteError instanceof Error ? deleteError.message : "Could not delete the course. Try again.");
    } finally { setDeletingCourse(null); }
  }

  async function uploadScreenshots(event: ChangeEvent<HTMLInputElement>, course: PlanCourse) {
    if (!activePlan) return;
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    const available = 5 - course.screenshots.length;
    if (files.length > available) {
      setCourseUploadState((current) => ({ ...current, [course.id]: { busy: false, error: `Choose no more than ${available} additional ${available === 1 ? "screenshot" : "screenshots"}.` } }));
      input.value = "";
      return;
    }

    setCourseUploadState((current) => ({ ...current, [course.id]: { busy: true } }));
    const failures: string[] = [];
    let uploaded = 0;
    for (const file of files) {
      try {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch(`/api/plans/${activePlan.id}/courses/${course.id}/screenshots`, { method: "POST", body: form });
        const body = await response.json().catch(() => null) as CourseScreenshotResponse | ApiError | null;
        if (!body) throw new Error("The upload service returned an unreadable response.");
        if (!response.ok) throw new Error((body as ApiError).error.message);
        const screenshot = (body as CourseScreenshotResponse).screenshot;
        setActivePlan((current) => current ? { ...current, courses: current.courses.map((item) => item.id === course.id ? { ...item, screenshots: [...item.screenshots, screenshot] } : item) } : current);
        uploaded += 1;
      } catch (uploadError) {
        failures.push(`${file.name}: ${uploadError instanceof Error ? uploadError.message : "Upload failed."}`);
      }
    }
    input.value = "";
    if (failures.length) {
      setCourseUploadState((current) => ({ ...current, [course.id]: { busy: false, error: `${uploaded ? `${uploaded} uploaded successfully. ` : ""}${failures.join(" ")}` } }));
    } else {
      setCourseUploadState((current) => ({ ...current, [course.id]: { busy: false, notice: `${uploaded} ${uploaded === 1 ? "screenshot" : "screenshots"} uploaded.` } }));
    }
  }

  async function removeScreenshot(course: PlanCourse, screenshot: CourseScreenshot) {
    if (!activePlan) return;
    setRemovingScreenshot(screenshot.id);
    setCourseError("");
    setCourseNotice("");
    try {
      const response = await fetch(`/api/plans/${activePlan.id}/courses/${course.id}/screenshots/${screenshot.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as ApiError | null;
        throw new Error(body?.error.message || "Could not remove the screenshot.");
      }
      setActivePlan((current) => current ? { ...current, courses: current.courses.map((item) => item.id === course.id ? { ...item, screenshots: item.screenshots.filter((image) => image.id !== screenshot.id) } : item) } : current);
      setConfirmingScreenshotDelete(null);
      setCourseUploadState((current) => ({ ...current, [course.id]: { busy: false, notice: `${screenshot.originalName} was removed.` } }));
      requestAnimationFrame(() => document.getElementById(`screenshots-${course.id}`)?.focus());
    } catch (removeError) {
      setCourseUploadState((current) => ({ ...current, [course.id]: { busy: false, error: removeError instanceof Error ? removeError.message : "Could not remove the screenshot. Try again." } }));
    } finally {
      setRemovingScreenshot(null);
    }
  }

  function beginScreenshotDelete(screenshotId: string) {
    setConfirmingScreenshotDelete(screenshotId);
    requestAnimationFrame(() => document.getElementById(`confirm-screenshot-delete-${screenshotId}`)?.focus());
  }

  function cancelScreenshotDelete(screenshotId: string) {
    setConfirmingScreenshotDelete(null);
    requestAnimationFrame(() => document.getElementById(`delete-screenshot-${screenshotId}`)?.focus());
  }

  function beginPlanDelete(planId: string) {
    setPlanError(""); setPlanNotice(""); setConfirmingDelete(planId);
    requestAnimationFrame(() => document.getElementById(`confirm-delete-${planId}`)?.focus());
  }

  function cancelPlanDelete(planId: string) {
    setConfirmingDelete(null);
    requestAnimationFrame(() => document.getElementById(`delete-plan-${planId}`)?.focus());
  }

  function beginCourseDelete(courseId: string) {
    setCourseError(""); setCourseNotice(""); setConfirmingCourseDelete(courseId);
    requestAnimationFrame(() => document.getElementById(`confirm-course-delete-${courseId}`)?.focus());
  }

  function cancelCourseDelete(courseId: string) {
    setConfirmingCourseDelete(null);
    requestAnimationFrame(() => document.getElementById(`delete-course-${courseId}`)?.focus());
  }

  function beginCourseEdit(courseId: string) {
    setEditingCourse(courseId);
    setEditCourseFields({});
    setCourseError("");
    setCourseNotice("");
    requestAnimationFrame(() => document.getElementById(`edit-code-${courseId}`)?.focus());
  }

  function cancelCourseEdit(courseId: string) {
    setEditingCourse(null);
    setEditCourseFields({});
    setCourseError("");
    requestAnimationFrame(() => document.getElementById(`edit-course-${courseId}`)?.focus());
  }

  function closeActivePlan() {
    const planId = activePlan?.id;
    setActivePlan(null);
    setEditingCourse(null);
    setReviewingCourseId(null);
    if (planId) requestAnimationFrame(() => document.getElementById(`open-plan-${planId}`)?.focus());
  }

  function beginOptionReview(courseId: string) {
    setReviewingCourseId(courseId);
    requestAnimationFrame(() => document.getElementById("extraction-review-title")?.focus());
  }

  function closeOptionReview(courseId: string) {
    setReviewingCourseId(null);
    requestAnimationFrame(() => document.getElementById(`review-options-${courseId}`)?.focus());
  }

  function updateReviewedCourse(updated: PlanCourse) {
    setActivePlan((current) => current ? { ...current, courses: current.courses.map((course) => course.id === updated.id ? updated : course) } : current);
  }

  async function logout() {
    setSigningOut(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as ApiError | null;
        throw new Error(body?.error.message || "The sign-out service is unavailable.");
      }
      startTransition(() => router.replace("/login"));
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Could not sign out. Try again.");
      setSigningOut(false);
    }
  }

  if (status === "loading") return <main className="session-state" aria-busy="true"><span className="brand-mark" aria-hidden="true">U</span><p role="status" aria-live="polite">Opening your planning workspace…</p></main>;
  if (status === "redirecting") return <main className="session-state"><span className="brand-mark" aria-hidden="true">U</span><p role="status">Your session ended. Taking you to sign in…</p></main>;
  if (status === "error" || !user) return <main className="session-state"><div className="form-alert" role="alert"><strong>Could not open your workspace</strong><span>{error || "The planning service is unavailable."}</span></div><div className="session-actions"><button className="secondary-button" onClick={() => window.location.reload()}>Retry workspace</button><button className="quiet-button" onClick={() => router.replace("/login")}>Return to sign in</button></div></main>;

  return <div className="planner-page">
    <header className="planner-header"><a className="brand" href="/planner"><span className="brand-mark" aria-hidden="true">U</span><span>UDST Schedule</span></a><div className="account-actions"><span>{user.email}</span><button className="quiet-button" type="button" onClick={logout} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button></div></header>
    <main className="planner-main">
      <section className="planner-intro" aria-labelledby="planner-title"><div><p className="context-label">Academic planning workspace</p><h1 id="planner-title">Build your course evidence one term at a time.</h1><p>Create a term, enter only the courses you intend to take, and keep each PeopleSoft screenshot attached to its exact course.</p></div><div className="term-stamp" aria-label="Current planning progress"><span>Available now</span><strong>Courses through review</strong><small>Schedule generation comes later</small></div></section>

      {(error || notice) && <div className={error ? "form-alert inline-alert" : "success-panel inline-alert"} role={error ? "alert" : "status"}><strong>{error ? "Could not complete that action" : "Plan updated"}</strong><span>{error || notice}</span></div>}

      <section className="term-workspace" aria-labelledby="create-term-title"><header><div><h2 id="create-term-title">Create a term plan</h2><p>Use the term name shown in PeopleSoft, such as Fall 2026.</p></div></header><form className="term-form" onSubmit={createPlan} aria-busy={creating}><div className="form-field"><label htmlFor="term-name">Term name</label><input id="term-name" name="term" type="text" required minLength={2} maxLength={60} placeholder="Fall 2026" disabled={creating} onChange={() => { setTermError(""); setError(""); setNotice(""); }} aria-invalid={Boolean(termError)} aria-describedby={termError ? "term-name-error" : "term-name-help"} /><span className={termError ? "field-error" : "field-help"} id={termError ? "term-name-error" : "term-name-help"}>{termError || "You can keep a separate plan for every academic term."}</span></div><button className="primary-button" type="submit" disabled={creating}>{creating ? "Saving term…" : "Create term plan"}</button></form></section>

      <section className="plans-region" aria-labelledby="plans-title"><header className="section-heading"><div><h2 id="plans-title" tabIndex={-1}>Your term plans</h2><p>{plans.length ? "Open a saved term to manage its course list." : "Saved terms will appear here."}</p></div><span aria-label={`${plans.length} saved term ${plans.length === 1 ? "plan" : "plans"}`}>{plans.length} saved</span></header>
        {(planError || planNotice) && <div className={planError ? "form-alert plans-feedback" : "success-panel plans-feedback"} role={planError ? "alert" : "status"}><strong>{planError ? "Could not update the plan" : "Plan updated"}</strong><span>{planError || planNotice}</span></div>}
        {plans.length === 0 ? <div className="plans-empty"><strong>No term plans yet</strong><p>Create your first term above. It will remain here when you sign out and return.</p></div> : <ul className="plans-list">{plans.map((plan) => <li key={plan.id} className={activePlan?.id === plan.id ? "active-plan-row" : undefined}><div className="plan-identity"><span className="plan-status">{plan.courseCount ? `${plan.courseCount} ${plan.courseCount === 1 ? "course" : "courses"}` : "No courses yet"}</span><h3>{plan.term}</h3><p>Created {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(plan.createdAt))}</p></div>{confirmingDelete === plan.id ? <div className="delete-confirmation" onKeyDown={(event) => { if (event.key === "Escape" && deleting !== plan.id) cancelPlanDelete(plan.id); }}><p>Delete this term and its courses?</p><div><button id={`confirm-delete-${plan.id}`} className="danger-button" type="button" onClick={() => deletePlan(plan)} disabled={deleting === plan.id}>{deleting === plan.id ? "Deleting…" : "Yes, delete"}</button><button className="quiet-button" type="button" onClick={() => cancelPlanDelete(plan.id)} disabled={deleting === plan.id}>Cancel</button></div></div> : <div className="plan-actions"><button id={`open-plan-${plan.id}`} className="secondary-button" type="button" onClick={() => openPlan(plan.id)} disabled={openingPlan === plan.id}>{openingPlan === plan.id ? "Opening…" : activePlan?.id === plan.id ? "Refresh term" : "Open term"}</button><button id={`delete-plan-${plan.id}`} className="quiet-button" type="button" onClick={() => beginPlanDelete(plan.id)}>Delete</button></div>}</li>)}</ul>}
      </section>

      {activePlan && <section className="course-workspace" aria-labelledby="course-workspace-title"><header className="course-workspace-header"><div><p className="context-label">Steps 1–2 of 4 · Courses and screenshots</p><h2 id="course-workspace-title" tabIndex={-1}>{activePlan.term}</h2><p>Enter each course, then attach only its PeopleSoft screenshots.</p></div><button className="quiet-button" type="button" onClick={closeActivePlan}>Close term</button></header>
        {(courseError || courseNotice) && <div className={courseError ? "form-alert course-feedback" : "success-panel course-feedback"} role={courseError ? "alert" : "status"}><strong>{courseError ? "Could not update the course list" : "Course list updated"}</strong><span>{courseError || courseNotice}</span></div>}
        <form className="course-form" onSubmit={addCourse} aria-busy={savingCourse && !editingCourse}><div className="form-field"><label htmlFor="course-code">Course code</label><input id="course-code" name="code" type="text" required minLength={2} maxLength={24} placeholder="BUSG 2002" disabled={savingCourse} onChange={() => { setAddCourseFields((current) => ({ ...current, code: "" })); setCourseError(""); setCourseNotice(""); }} aria-invalid={Boolean(addCourseFields.code)} aria-describedby={addCourseFields.code ? "course-code-error" : "course-code-help"} /><span className={addCourseFields.code ? "field-error" : "field-help"} id={addCourseFields.code ? "course-code-error" : "course-code-help"}>{addCourseFields.code || "Use the code displayed in PeopleSoft."}</span></div><div className="form-field"><label htmlFor="course-name">Course name <span className="optional-label">Optional</span></label><input id="course-name" name="name" type="text" maxLength={100} placeholder="Project Management" disabled={savingCourse} onChange={() => { setAddCourseFields((current) => ({ ...current, name: "" })); setCourseError(""); setCourseNotice(""); }} aria-invalid={Boolean(addCourseFields.name)} aria-describedby={addCourseFields.name ? "course-name-error" : undefined} />{addCourseFields.name && <span className="field-error" id="course-name-error">{addCourseFields.name}</span>}</div><button className="primary-button" type="submit" disabled={savingCourse}>{savingCourse && !editingCourse ? "Adding course…" : "Add course"}</button></form>

        <div className="courses-region"><div className="courses-heading"><div><h3 id="courses-title" tabIndex={-1}>Courses in this term</h3><p>{activePlan.courses.length ? "These are the only courses that will enter schedule generation." : "Add every course you plan to take this term."}</p></div><span>{activePlan.courses.length} {activePlan.courses.length === 1 ? "course" : "courses"}</span></div>
          {activePlan.courses.length === 0 ? <div className="courses-empty"><strong>No courses added</strong><p>Start with the course code exactly as it appears in PeopleSoft.</p></div> : <ul className="courses-list">{activePlan.courses.map((course) => <li key={course.id}>{editingCourse === course.id ? <form className="course-edit-form" onSubmit={(event) => updateCourse(event, course)} aria-busy={savingCourse}><div className="form-field"><label htmlFor={`edit-code-${course.id}`}>Course code</label><input id={`edit-code-${course.id}`} name="code" defaultValue={course.code} required minLength={2} maxLength={24} disabled={savingCourse} onChange={() => { setEditCourseFields((current) => ({ ...current, code: "" })); setCourseError(""); }} aria-invalid={Boolean(editCourseFields.code)} aria-describedby={editCourseFields.code ? `edit-code-error-${course.id}` : undefined} />{editCourseFields.code && <span className="field-error" id={`edit-code-error-${course.id}`}>{editCourseFields.code}</span>}</div><div className="form-field"><label htmlFor={`edit-name-${course.id}`}>Course name <span className="optional-label">Optional</span></label><input id={`edit-name-${course.id}`} name="name" defaultValue={course.name ?? ""} maxLength={100} disabled={savingCourse} onChange={() => { setEditCourseFields((current) => ({ ...current, name: "" })); setCourseError(""); }} aria-invalid={Boolean(editCourseFields.name)} aria-describedby={editCourseFields.name ? `edit-name-error-${course.id}` : undefined} />{editCourseFields.name && <span className="field-error" id={`edit-name-error-${course.id}`}>{editCourseFields.name}</span>}</div><div className="edit-actions"><button className="primary-button" type="submit" disabled={savingCourse}>{savingCourse ? "Saving…" : "Save changes"}</button><button className="quiet-button" type="button" onClick={() => cancelCourseEdit(course.id)} disabled={savingCourse}>Cancel</button></div></form> : <><div className="course-identity"><span>Course</span><h4>{course.code}</h4><p>{course.name || "No course name added"}</p></div>{confirmingCourseDelete === course.id ? <div className="delete-confirmation" onKeyDown={(event) => { if (event.key === "Escape" && deletingCourse !== course.id) cancelCourseDelete(course.id); }}><p>Remove this course?</p><div><button id={`confirm-course-delete-${course.id}`} className="danger-button" type="button" onClick={() => deleteCourse(course)} disabled={deletingCourse === course.id}>{deletingCourse === course.id ? "Removing…" : "Yes, remove"}</button><button className="quiet-button" type="button" onClick={() => cancelCourseDelete(course.id)} disabled={deletingCourse === course.id}>Cancel</button></div></div> : <div className="course-actions"><button id={`edit-course-${course.id}`} className="secondary-button" type="button" onClick={() => beginCourseEdit(course.id)}>Edit</button><button id={`delete-course-${course.id}`} className="quiet-button" type="button" onClick={() => beginCourseDelete(course.id)}>Remove</button></div>}</>}</li>)}</ul>}
          {activePlan.courses.length > 0 && <section className="screenshots-region" aria-labelledby="screenshots-title">
            <header><div><h3 id="screenshots-title">Course screenshots</h3><p>Each private image stays associated with the course shown beside it.</p></div></header>
            <div className="privacy-notice" role="note"><strong>Remove personal information before uploading</strong><span>Hide your name, student ID, email address, and any other private details. Never upload PeopleSoft credentials. Files are stored in this app’s private local development folder and deleted when you remove the screenshot, course, or term. Automatic extraction sends copies to OpenAI only after consent. PNG and JPEG only, up to 5 MB each and five per course.</span></div>
            <div className="screenshot-courses">{activePlan.courses.map((course) => <article className="screenshot-course" key={course.id} aria-labelledby={`screenshot-course-${course.id}`} aria-busy={courseUploadState[course.id]?.busy || undefined}>
              <header><div><h4 id={`screenshot-course-${course.id}`}>{course.code}</h4><p>{course.name || "Course screenshots"}</p></div><div className="screenshot-course-actions"><span>{course.screenshots.length} of 5 uploaded</span><button id={`review-options-${course.id}`} className="secondary-button" type="button" onClick={() => beginOptionReview(course.id)}>{course.options.length ? "Review options" : "Enter options"}</button></div></header>
              <div className="screenshot-upload-control"><label htmlFor={`screenshots-${course.id}`}>Add screenshots</label><input id={`screenshots-${course.id}`} type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" multiple disabled={courseUploadState[course.id]?.busy || course.screenshots.length >= 5} onChange={(event) => uploadScreenshots(event, course)} aria-describedby={`screenshot-help-${course.id}`} /><span id={`screenshot-help-${course.id}`}>{courseUploadState[course.id]?.busy ? "Uploading selected files…" : course.screenshots.length >= 5 ? "Maximum reached. Remove a screenshot to replace it." : "Select one or more PNG or JPEG files."}</span></div>
              {(courseUploadState[course.id]?.error || courseUploadState[course.id]?.notice) && <div className={courseUploadState[course.id]?.error ? "upload-message upload-error" : "upload-message upload-success"} role={courseUploadState[course.id]?.error ? "alert" : "status"}>{courseUploadState[course.id]?.error || courseUploadState[course.id]?.notice}</div>}
              {course.screenshots.length === 0 ? <p className="screenshot-empty">No screenshots uploaded for this course.</p> : <ul className="screenshot-list">{course.screenshots.map((screenshot) => <li key={screenshot.id}>
                <a className="screenshot-preview" href={`/api/plans/${activePlan.id}/courses/${course.id}/screenshots/${screenshot.id}`} target="_blank" rel="noreferrer" aria-label={`Open ${screenshot.originalName} in a new tab`}><Image src={`/api/plans/${activePlan.id}/courses/${course.id}/screenshots/${screenshot.id}`} alt={`Preview of ${screenshot.originalName}`} width={160} height={100} unoptimized /></a>
                <div className="screenshot-details"><strong>{screenshot.originalName}</strong><span>{(screenshot.size / 1024 / 1024).toFixed(2)} MB · Private</span></div>
                {confirmingScreenshotDelete === screenshot.id ? <div className="screenshot-delete-confirm" onKeyDown={(event) => { if (event.key === "Escape" && removingScreenshot !== screenshot.id) cancelScreenshotDelete(screenshot.id); }}><span>Remove?</span><button id={`confirm-screenshot-delete-${screenshot.id}`} className="danger-button" type="button" onClick={() => removeScreenshot(course, screenshot)} disabled={removingScreenshot === screenshot.id}>{removingScreenshot === screenshot.id ? "Removing…" : "Yes, remove"}</button><button className="quiet-button" type="button" onClick={() => cancelScreenshotDelete(screenshot.id)} disabled={removingScreenshot === screenshot.id}>Cancel</button></div> : <button id={`delete-screenshot-${screenshot.id}`} className="quiet-button" type="button" onClick={() => beginScreenshotDelete(screenshot.id)}>Remove</button>}
              </li>)}</ul>}
            </article>)}</div>
          </section>}
        </div>
        {reviewingCourseId && activePlan.courses.find((course) => course.id === reviewingCourseId) && <ExtractionReview key={reviewingCourseId} planId={activePlan.id} course={activePlan.courses.find((course) => course.id === reviewingCourseId)!} onCourseChange={updateReviewedCourse} onClose={() => closeOptionReview(reviewingCourseId)} />}
      </section>}
    </main>
    <footer className="planner-footer">Planning only · Registration remains in PeopleSoft</footer>
  </div>;
}
