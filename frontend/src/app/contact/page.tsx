'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api-service';
import { Mail, Phone, MapPin, Loader2 } from 'lucide-react';

export default function ContactPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const form = e.target as HTMLFormElement;
        
        try {
            await apiService.submitContactForm({
                first_name: form.firstName.value,
                last_name: form.lastName.value,
                email: form.email.value,
                subject: form.subject.value,
                message: form.message.value
            });
            toast({
                title: "Message Sent!",
                description: "We've received your inquiry and will get back to you within 24 hours.",
            });
            form.reset();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to send message. Please try again later.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Header />

            <main className="flex-1 container py-12 md:py-24">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16 space-y-4">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                            Get in Touch
                        </h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Whether you're looking for wholesale partnerships, have a question about an order, or just want to say hello, we're here to help.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-start">
                        {/* Contact Information */}
                        <div className="space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Contact Information</h2>
                            
                            <div className="flex items-start gap-4">
                                <div className="bg-primary/10 p-3 rounded-full shrink-0">
                                    <Phone className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Phone Support</h3>
                                    <p className="text-slate-600 mb-1">+91 78700 53331</p>
                                    <p className="text-sm text-slate-500">Mon - Sat, 9:00 AM - 6:00 PM (IST)</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-primary/10 p-3 rounded-full shrink-0">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Email Us</h3>
                                    <p className="text-slate-600 mb-1">support@pranjay.com</p>
                                    <p className="text-sm text-slate-500">We aim to respond within 24 hours.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-primary/10 p-3 rounded-full shrink-0">
                                    <MapPin className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Headquarters</h3>
                                    <p className="text-slate-600 leading-relaxed">
                                        Pranjay E-commerce Pvt. Ltd.<br />
                                        Darbhanga, Bihar<br />
                                        India
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Send us a Message</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input id="firstName" required placeholder="John" className="bg-slate-50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input id="lastName" required placeholder="Doe" className="bg-slate-50" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" required placeholder="john@example.com" className="bg-slate-50" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Input id="subject" required placeholder="How can we help?" className="bg-slate-50" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea 
                                        id="message" 
                                        required 
                                        placeholder="Please provide details about your inquiry..." 
                                        className="min-h-[150px] bg-slate-50 resize-y" 
                                    />
                                </div>

                                <Button 
                                    type="submit" 
                                    className="w-full bg-[#d81b60] hover:bg-[#c2185b] text-white h-12 text-lg font-semibold"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Message'
                                    )}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
