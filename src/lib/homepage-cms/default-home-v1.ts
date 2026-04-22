import type { HomePageDocument } from './types';

/** Canonical initial homepage payload (HOMEPAGE_CMS_IMPLEMENTATION_SPEC §3.1). */
export const DEFAULT_HOME_V1: HomePageDocument = {
  schemaVersion: 'home_v1',
  page: {
    slug: 'home',
    title: 'Homepage',
    sections: [
      {
        sectionKey: 'hero_main',
        type: 'hero',
        order: 1,
        enabled: true,
        data: {
          backgroundVideo: { url: '/HeroVid.mp4', posterUrl: '' },
          overlayEnabled: true,
          headingLines: [
            'Helping resolve the',
            'Overcoming Disaster :',
            'Using People, Technology & AI',
          ],
          description:
            'A disaster management ecosystem that helps people ,through real time Intelligent , connected devices and active people coordination.',
          newsletterCard: {
            enabled: true,
            title: 'Please join our newsletter to get latest updates on our launch & offers!',
          },
          tickerEnabled: true,
        },
      },
      {
        sectionKey: 'impact_stats',
        type: 'impact_stats',
        order: 2,
        enabled: true,
        data: {
          titlePrefix: 'The True Cost of',
          titleHighlight: 'Delayed Emergency Response',
          subtitle:
            "Disasters don't just destroy infrastructure – they steal time, lives, and hope.",
          backgroundImage: '/CrisisBG.png',
          cards: [
            {
              metric: '$100+',
              metricLabel: 'Billions',
              title: 'Average annual disaster damage in the United States',
              description:
                'Climate-driven disasters are increasing in frequency and severity every year.',
            },
            {
              metric: '16,000+',
              metricLabel: 'Lives Lost',
              title: 'In U.S. disasters since 1980',
              description:
                'Climate-driven disasters are increasing in frequency and severity every year.',
            },
            {
              metric: '5,000+',
              metricLabel: 'Missing',
              title: 'During floods, hurricanes, fires, and earthquakes',
              description:
                'Families lose contact. Responders lack precise location data.',
            },
            {
              metric: '30-40%',
              metricLabel: 'Lost Lives',
              title: 'Could be avoided with faster location, communication, and response',
              description: 'Minutes matter. Technology saves lives.',
            },
          ],
          bottomTagline: 'When help is late, R3SULTS shows up!',
        },
      },
      {
        sectionKey: 'features_building',
        type: 'feature_overview',
        order: 3,
        enabled: true,
        data: {
          titlePrefix: 'What we are',
          titleHighlight: 'building?',
          subtitle:
            'An easy-to-use disaster management platform that provides comprehensive tools and resources to help you prepare, respond, and recover from any crisis.',
          carouselEnabled: true,
          sideImageDesktop: '/IPadImg.webp',
          sideImageMobile: '/IPadImg.webp',
        },
      },
      {
        sectionKey: 'lifeline_grid',
        type: 'lifeline_features_grid',
        order: 4,
        enabled: true,
        data: {
          titlePrefix: 'Your',
          titleHighlight: 'Lifeline',
          titleSuffix: 'in Crisis',
          subtitle:
            'Comprehensive disaster preparedness and response features designed to keep you and your loved ones safe.',
          items: [
            {
              title: 'Disaster Alerts',
              line1: 'AI-powered real-time',
              line2: 'notifications for imminent',
              line3: 'threats in your area',
              iconKey: 'disaster_alerts',
            },
            {
              title: 'Shelter Locator',
              line1: 'AI-powered real-time',
              line2: 'find nearby safe shelters',
              line3: 'with live capacity information',
              iconKey: 'shelter_locator',
            },
            {
              title: 'Medical Assistance',
              line1: 'AI-powered real-time',
              line2: 'connect with emergency',
              line3: 'medical services and resources',
              iconKey: 'medical_assistance',
            },
            {
              title: 'Insurance & Relief',
              line1: 'AI-powered real-time',
              line2: 'streamline insurance claims',
              line3: 'and relief program access',
              iconKey: 'insurance_relief',
            },
            {
              title: 'Emergency Supplies',
              line1: 'AI-powered real-time',
              line2: 'locate stores for essential',
              line3: 'supplies and provisions',
              iconKey: 'emergency_supplies',
            },
            {
              title: 'Family Finder',
              line1: 'AI-powered real-time',
              line2: 'pinpoint loved ones',
              line3: 'via GPS or data',
              iconKey: 'family_finder',
            },
            {
              title: 'Damage Reporting',
              line1: 'AI-powered real-time',
              line2: 'document and report damage',
              line3: 'for expedited aid efforts',
              iconKey: 'damage_reporting',
            },
            {
              title: 'Recovery Tracking',
              line1: 'AI-powered real-time',
              line2: 'monitor restoration progress',
              line3: 'and community rebuilding',
              iconKey: 'recovery_tracking',
            },
          ],
          emailPrompt: 'Be Disaster-Ready. Subscribe for Launch Updates',
          emailFormEnabled: true,
        },
      },
      {
        sectionKey: 'coming_soon_wearable',
        type: 'coming_soon_wearable',
        order: 5,
        enabled: true,
        data: {
          revealText: 'Revealing soon',
          productImage: '/WatchImg.png',
          titleLines: ['IOT-powered Wearable', 'for emergency', 'tracking'],
          subtitle: 'Join the Early Access Program',
          emailFormEnabled: true,
        },
      },
      {
        sectionKey: 'action_video_mobile',
        type: 'action_video_mobile',
        order: 6,
        enabled: true,
        data: {
          videoUrl: '/ActionMob.mp4',
          controls: true,
        },
      },
      {
        sectionKey: 'action_video_desktop',
        type: 'action_video_desktop',
        order: 7,
        enabled: true,
        data: {
          videoUrl: '/Action.mp4',
          controls: true,
        },
      },
      {
        sectionKey: 'testimonials',
        type: 'testimonials',
        order: 8,
        enabled: true,
        data: {
          mode: 'component_managed',
          componentKey: 'TestimonialsSection',
        },
      },
      {
        sectionKey: 'live_impact_updates',
        type: 'live_impact_updates',
        order: 9,
        enabled: true,
        data: {
          titlePrefix: 'Live Impact',
          titleHighlight: 'Updates',
          subtitle:
            'Real-time stories from the field, community highlights, and relief operations.',
          items: [
            {
              title:
                'Flash floods devastate coastal cities, emergency services overwhelmed',
              description:
                'Floods devastate coastal cities, infrastructure overwhelmed, emergency systems over-stressed.',
              imageUrl: '/Impact3.jpeg',
              activeReliefPartners: 12,
              donationsRaised: 198500,
            },
            {
              title: 'Wildfires spread rapidly, communities evacuated',
              description:
                'Wildfires spread rapidly, communities evacuated, homes lost and people struggling.',
              imageUrl: '/Impact1.jpg',
              activeReliefPartners: 15,
              donationsRaised: 128300,
            },
            {
              title:
                'Earthquake strikes urban region, buildings damaged, rescue operations underway',
              description:
                'Earthquake strikes urban region, buildings damaged, rescue operations underway.',
              imageUrl: '/Impact4.jpg',
              activeReliefPartners: 8,
              donationsRaised: 450000,
            },
            {
              title:
                'Hurricane causes widespread power outages, relief efforts mobilized',
              description:
                'Hurricane causes widespread power outages, relief efforts mobilized across affected regions.',
              imageUrl: '/Impact2.jpg',
              activeReliefPartners: 20,
              donationsRaised: 320000,
            },
          ],
        },
      },
      {
        sectionKey: 'guides',
        type: 'guides',
        order: 10,
        enabled: true,
        data: {
          mode: 'component_managed',
          componentKey: 'GuidesSection',
        },
      },
      {
        sectionKey: 'community_cta',
        type: 'community_cta',
        order: 11,
        enabled: true,
        data: {
          badgeText: 'Our Community',
          title: 'Join our community',
          description:
            'Stay connected with the R3sults mission to protect families and responders. Subscribe to receive disaster alert updates, launch announcements, and helpful preparedness content directly in your inbox.',
          bulletPoints: [
            'Real-time emergency and platform alerts',
            'Product updates, offers, and launch news',
          ],
          formTitle: 'Get email alerts and marketing updates',
          formDescription:
            'Click the email field to open the form, verify the code, then tap Join.',
        },
      },
      {
        sectionKey: 'footer',
        type: 'footer',
        order: 12,
        enabled: true,
        data: {
          mode: 'component_managed',
          componentKey: 'Footer',
        },
      },
    ],
  },
};
