"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "./stripe-buy-button-fix.css";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const sidebarItems = [
  { label: "Account settings", value: "account" },
  { label: "Notifications", value: "notifications" },
  { label: "Plans and Pricing", value: "plans" },
];

export default function AccountSettingPage() {
  const [section, setSection] = useState("account");
  const [selectedPlan, setSelectedPlan] = useState("premium"); // Por defecto premium
  const [isLoading, setIsLoading] = useState(false); // Nuevo estado para controlar la carga
  const { user } = useAuth();
  const [userPlan, setUserPlan] = useState<string | null>(null);
  // Datos de ejemplo, luego se reemplazarán por datos reales del usuario
  const [firstName, setFirstName] = useState("Ildiko");
  const [lastName, setLastName] = useState("Gaspar");
  const [location, setLocation] = useState("emailis@private.com");
  const [profession, setProfession] = useState("UI/UX Designer");
  const [showConfirmFree, setShowConfirmFree] = useState(false);
  const [pendingFree, setPendingFree] = useState(false);

  useEffect(() => {
    // Cargar el script de Stripe solo una vez
    if (!document.getElementById("stripe-buy-button-script")) {
      const script = document.createElement("script");
      script.id = "stripe-buy-button-script";
      script.src = "https://js.stripe.com/v3/buy-button.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const fetchUserPlan = async () => {
        const userRef = doc(db, "user_data", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserPlan(userSnap.data().plan);
        } else {
          setUserPlan("free");
        }
      };
      fetchUserPlan();
    }
  }, [user]);

  const handleStripeCheckout = async (plan: string) => {
    if (!user) {
      alert("Debes iniciar sesión para comprar un plan.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/create-stripe-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid, plan }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error al crear la sesión de pago.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar el pago.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFree = () => {
    if (userPlan === "premium" || userPlan === "pro") {
      setShowConfirmFree(true);
    } else {
      setSelectedPlan("free");
    }
  };

  const confirmChangeToFree = async () => {
    if (!user) return;
    setPendingFree(true);
    try {
      const userRef = doc(db, "user_data", user.uid);
      await updateDoc(userRef, { plan: "free" });
      setUserPlan("free");
      setSelectedPlan("free");
      setShowConfirmFree(false);
    } catch (e) {
      alert("Error updating plan");
    } finally {
      setPendingFree(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full my-10">
      <div className="w-full max-w-5xl flex bg-card rounded-lg shadow-lg overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-muted/30 border-r px-6 py-8 flex flex-col gap-2">
          <h2 className="text-2xl font-bold mb-6">Settings</h2>
          <nav className="flex flex-col gap-2">
            {sidebarItems.map((item) => (
              <button
                key={item.value}
                className={`text-left px-4 py-2 rounded-md font-medium transition-colors ${section === item.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40"}`}
                onClick={() => setSection(item.value)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-10">
          {section === "account" && (
            <div>
              <h3 className="text-xl font-bold mb-6">Account settings</h3>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <div>
                  <label className="block mb-1 font-medium">First name</label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="flex h-12 w-full rounded-md border-[0.4px] border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Last name</label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} className="flex h-12 w-full rounded-md border-[0.4px] border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 font-medium">E-mail</label>
                  <Input value={location} disabled className="flex h-12 w-full rounded-md border-[0.4px] border-gray-300 px-3 py-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                </div>
                <div className="md:col-span-2 mb-2">
                  <label className="block mb-1 font-medium mt-2">Password</label>
                  <Button type="button" variant="outline" className="mt-1 mb-4" onClick={() => alert('Password change functionality coming soon.')}>Change password</Button>
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 font-medium">Profession</label>
                  <Input value={profession} onChange={e => setProfession(e.target.value)} className="flex h-12 w-full rounded-md border-[0.4px] border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />
                </div>
                <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                  <Button type="submit">Save changes</Button>
                </div>
              </form>
            </div>
          )}
          {/* Aquí irán las otras secciones (Notifications, Plans and Pricing) */}
          {section === "notifications" && (
            <div>
              <h3 className="text-xl font-bold mb-6">Notifications</h3>
              <p className="text-muted-foreground">Aquí podrás gestionar tus notificaciones.</p>
            </div>
          )}
          {section === "plans" && (
            <div>
              <h3 className="text-xl font-bold mb-6">Plans and Pricing</h3>
              <p className="mb-8 text-muted-foreground">Aquí podrás gestionar tu plan de facturación y beneficios.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Free Plan */}
                <div className={`bg-muted/30 rounded-lg border p-6 flex flex-col justify-between h-full min-h-[420px] items-center shadow-md transition-all duration-200 ${selectedPlan === "free" ? "border-primary scale-105 shadow-lg" : "border-muted-foreground/20"}`}>
                  <div className="w-full flex-1 flex flex-col items-center">
                    <h4 className="text-lg font-bold mb-2">Free</h4>
                    <p className="text-3xl font-bold mb-2">$0</p>
                    <p className="mb-4 text-muted-foreground">per month</p>
                    <ul className="mb-6 text-sm text-muted-foreground space-y-2">
                      <li>✔️ 1 video export per week</li>
                      <li>✔️ Basic avatars</li>
                      <li>✔️ Community support</li>
                    </ul>
                  </div>
                  <Button
                    variant={selectedPlan === "free" ? "default" : "outline"}
                    className="w-full mt-4"
                    disabled={selectedPlan === "free" || userPlan === "free"}
                    onClick={handleSelectFree}
                  >
                    {selectedPlan === "free" ? "Current plan" : "Select plan"}
                  </Button>
                </div>
                {/* Modal de confirmación para cambio a free */}
                {showConfirmFree && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg flex flex-col items-center">
                      <p className="mb-4 text-center text-gray-800">
                        Are you sure to change your plan to free? You will lose your {userPlan} functions.
                      </p>
                      <div className="flex gap-4 w-full justify-center">
                        <Button variant="outline" onClick={() => setShowConfirmFree(false)} disabled={pendingFree}>Cancel</Button>
                        <Button onClick={confirmChangeToFree} disabled={pendingFree} style={{ backgroundColor: '#635BFF', color: '#fff' }}>
                          {pendingFree ? 'Saving...' : 'Confirm'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Premium Plan */}
                <div className={`bg-muted/30 rounded-lg border p-6 flex flex-col justify-between h-full min-h-[420px] items-center shadow-md transition-all duration-200 ${selectedPlan === "premium" ? "border-primary scale-105 shadow-lg" : "border-muted-foreground/20"}`}>
                  <div className="w-full flex-1 flex flex-col items-center">
                    <h4 className="text-lg font-bold mb-2">Premium</h4>
                    <p className="text-3xl font-bold mb-2">$15</p>
                    <p className="mb-4 text-muted-foreground">per month</p>
                    <ul className="mb-6 text-sm text-muted-foreground space-y-2">
                      <li>✔️ 20 video exports per month</li>
                      <li>✔️ Premium avatars</li>
                      <li>✔️ Priority support</li>
                      <li>✔️ Early access to new features</li>
                    </ul>
                  </div>
                  <div className="w-full flex flex-col items-center">
                    <div className="w-full max-w-[220px] flex flex-col items-center">
                      {selectedPlan === "premium" ? (
                        <Button disabled className="w-full mt-4">
                          Current plan
                        </Button>
                      ) : (
                        <Button
                          style={{ backgroundColor: '#635BFF', color: '#fff', width: '100%' }}
                          className="w-full"
                          onClick={() => handleStripeCheckout('premium')}
                          disabled={isLoading || userPlan === "premium"}
                        >
                          {isLoading ? 'Cargando...' : 'Pagar con Stripe'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {/* Pro Plan */}
                <div className={`bg-muted/30 rounded-lg border p-6 flex flex-col justify-between h-full min-h-[420px] items-center shadow-md transition-all duration-200 ${selectedPlan === "pro" ? "border-primary scale-105 shadow-lg" : "border-muted-foreground/20"}`}>
                  <div className="w-full flex-1 flex flex-col items-center">
                    <h4 className="text-lg font-bold mb-2">Pro</h4>
                    <p className="text-3xl font-bold mb-2">$30</p>
                    <p className="mb-4 text-muted-foreground">per month</p>
                    <ul className="mb-6 text-sm text-muted-foreground space-y-2">
                      <li>✔️ 100 video exports per month</li>
                      <li>✔️ All avatars unlocked</li>
                      <li>✔️ Dedicated account manager</li>
                      <li>✔️ Team collaboration</li>
                    </ul>
                  </div>
                  <div className="w-full flex flex-col items-center">
                    <div className="w-full max-w-[220px] flex flex-col items-center">
                      {selectedPlan === "pro" ? (
                        <Button disabled className="w-full mt-4">
                          Current plan
                        </Button>
                      ) : (
                        <Button
                          style={{ backgroundColor: '#635BFF', color: '#fff', width: '100%' }}
                          className="w-full"
                          onClick={() => handleStripeCheckout('pro')}
                          disabled={isLoading || userPlan === "pro"}
                        >
                          {isLoading ? 'Cargando...' : 'Pagar con Stripe'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 