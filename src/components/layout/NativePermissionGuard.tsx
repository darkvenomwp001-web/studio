'use client';

import { useEffect } from 'react';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Contacts } from '@capacitor-community/contacts';
import { useToast } from '@/hooks/use-toast';

/**
 * NativePermissionGuard ensures that APK users are prompted for essential
 * permissions (Camera, Media, Location, Contacts) upon first launch.
 */
export default function NativePermissionGuard() {
    const { toast } = useToast();

    useEffect(() => {
        const initializePermissions = async () => {
            // Check if we are running in a native environment (APK/IPA)
            const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
            
            if (!isNative) return;

            const isInitialized = localStorage.getItem('native_permissions_initialized');
            if (isInitialized) return;

            try {
                // Request Camera and Media Permissions
                await Camera.requestPermissions({
                    permissions: ['camera', 'photos']
                });

                // Request Location Permissions
                await Geolocation.requestPermissions();

                // Request Contacts Permissions
                await Contacts.requestPermissions();

                // Mark as initialized to prevent constant re-prompting on every load
                localStorage.setItem('native_permissions_initialized', 'true');
                
                console.log("APK Permission Protocol: Success");
            } catch (error) {
                console.warn("APK Permission Protocol: User interrupted or denied specific scopes.", error);
            }
        };

        initializePermissions();
    }, []);

    return null; // Silent guard, only handles the interaction protocol
}
