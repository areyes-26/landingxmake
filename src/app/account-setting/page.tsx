"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "./stripe-buy-button-fix.css";

const sidebarItems = [
  { label: "Account settings", value: "account" },
  { label: "Notifications", value: "notifications" },
  { label: "Plans and Pricing", value: "plans" },
];

export default function AccountSettingPage() {
  const [section, setSection] = useState("account");
  const [selectedPlan, setSelectedPlan] = useState("premium"); // Por defecto premium
  // Datos de ejemplo, luego se reemplazarán por datos reales del usuario
  const [firstName, setFirstName] = useState("Ildiko");
  const [lastName, setLastName] = useState("Gaspar");
  const [location, setLocation] = useState("emailis@private.com");
  const [profession, setProfession] = useState("UI/UX Designer");

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
              <div className="flex items-center gap-8 mb-8">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary/30">
                  {/* Avatar de ejemplo, luego se reemplaza por el real */}
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-2">
                  <Button className="w-40">Change picture</Button>
                  <Button variant="outline" className="w-40">Delete picture</Button>
                </div>
              </div>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <div>
                  <label className="block mb-1 font-medium">First name</label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Last name</label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 font-medium">E-mail</label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 font-medium">Profession</label>
                  <Input value={profession} onChange={e => setProfession(e.target.value)} />
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
                    disabled={selectedPlan === "free"}
                    onClick={() => setSelectedPlan("free")}
                  >
                    {selectedPlan === "free" ? "Current plan" : "Select plan"}
                  </Button>
                </div>
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
                      <Button
                        variant={selectedPlan === "premium" ? "default" : "outline"}
                        className="w-full mt-4"
                        disabled={selectedPlan === "premium"}
                        onClick={() => setSelectedPlan("premium")}
                      >
                        {selectedPlan === "premium" ? "Current plan" : "Select plan"}
                      </Button>
                      {selectedPlan === "premium" && (
                        <a
                          href="https://buy.stripe.com/test_cNi6oJ97hgr62pf5Db2wU01"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full mt-2"
                        >
                          <Button
                            style={{ backgroundColor: '#635BFF', color: '#fff', width: '100%' }}
                            className="w-full"
                          >
                            Pagar con Stripe
                          </Button>
                        </a>
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
                      <Button
                        variant={selectedPlan === "pro" ? "default" : "outline"}
                        className="w-full mt-4"
                        disabled={selectedPlan === "pro"}
                        onClick={() => setSelectedPlan("pro")}
                      >
                        {selectedPlan === "pro" ? "Current plan" : "Select plan"}
                      </Button>
                      {selectedPlan === "pro" && (
                        <a
                          href="https://buy.stripe.com/test_dRm8wR5V56Qw0h7aXv2wU00"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full mt-2"
                        >
                          <Button
                            style={{ backgroundColor: '#635BFF', color: '#fff', width: '100%' }}
                            className="w-full"
                          >
                            Pagar con Stripe
                          </Button>
                        </a>
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