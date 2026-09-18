import type * as prismic from "@prismicio/client";

type Simplify<T> = { [KeyType in keyof T]: T[KeyType] };


type PickContentRelationshipFieldData<
	TRelationship extends prismic.CustomTypeModelFetchCustomTypeLevel1 | prismic.CustomTypeModelFetchCustomTypeLevel2 | prismic.CustomTypeModelFetchGroupLevel1 | prismic.CustomTypeModelFetchGroupLevel2,
	TData extends Record<string, prismic.AnyRegularField | prismic.GroupField | prismic.NestedGroupField | prismic.SliceZone>,
	TLang extends string
> = |
	// Content relationship fields
	{
		[TSubRelationship in Extract<
			TRelationship["fields"][number], prismic.CustomTypeModelFetchContentRelationshipLevel1
		> as TSubRelationship["id"]]:
			ContentRelationshipFieldWithData<TSubRelationship["customtypes"], TLang>;
	} &
	// Group
	{
		[TGroup in Extract<
			TRelationship["fields"][number], prismic.CustomTypeModelFetchGroupLevel1 | prismic.CustomTypeModelFetchGroupLevel2
		> as TGroup["id"]]:
			TData[TGroup["id"]] extends prismic.GroupField<infer TGroupData>
				? prismic.GroupField<PickContentRelationshipFieldData<TGroup, TGroupData, TLang>>
				: never
	} &
	// Other fields
	{
		[TFieldKey in Extract<TRelationship["fields"][number], string>]:
			TFieldKey extends keyof TData ? TData[TFieldKey] : never;
	};

type ContentRelationshipFieldWithData<
	TCustomType extends readonly (prismic.CustomTypeModelFetchCustomTypeLevel1 | string)[] | readonly (prismic.CustomTypeModelFetchCustomTypeLevel2 | string)[],
	TLang extends string = string
> = {
	[ID in Exclude<TCustomType[number], string>["id"]]:
		prismic.ContentRelationshipField<
			ID,
			TLang,
			PickContentRelationshipFieldData<
				Extract<TCustomType[number], { id: ID }>,
				Extract<prismic.Content.AllDocumentTypes, { type: ID }>["data"],
				TLang
			>
		>
}[Exclude<TCustomType[number], string>["id"]];

type ArtistDocumentDataSlicesSlice = RichTextSlice | QuoteSlice

/**
 * Content for Artist documents
 */
interface ArtistDocumentData {
	/**
	 * Name field in *Artist*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.name
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	name: prismic.KeyTextField;
	
	/**
	 * Photo field in *Artist*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.photo
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	photo: prismic.ImageField<never>;
	
	/**
	 * Discipline field in *Artist*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Hindustani Vocal
	 * - **API ID Path**: artist.discipline
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	discipline: prismic.KeyTextField;
	
	/**
	 * Bio field in *Artist*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.bio
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	bio: prismic.KeyTextField;
	
	/**
	 * Instagram field in *Artist*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.instagram
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	instagram: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * YouTube field in *Artist*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.youtube
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	youtube: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * Features Eyebrow field in *Artist*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Appearances
	 * - **API ID Path**: artist.features_eyebrow
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	features_eyebrow: prismic.KeyTextField;
	
	/**
	 * Features Title field in *Artist*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: {Name} at Svarit
	 * - **API ID Path**: artist.features_title
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	features_title: prismic.KeyTextField;/**
	 * Slice Zone field in *Artist*
	 *
	 * - **Field Type**: Slice Zone
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.slices[]
	 * - **Tab**: Body
	 * - **Documentation**: https://prismic.io/docs/slices
	 */
	slices: prismic.SliceZone<ArtistDocumentDataSlicesSlice>;/**
	 * Meta Title field in *Artist*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Defaults to "{Name} at Svarit"
	 * - **API ID Path**: artist.meta_title
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_title: prismic.KeyTextField;
	
	/**
	 * Meta Description field in *Artist*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Defaults to the artist's Bio
	 * - **API ID Path**: artist.meta_description
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_description: prismic.KeyTextField;
	
	/**
	 * Meta Image field in *Artist*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.meta_image
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	meta_image: prismic.ImageField<never>;
}

/**
 * Artist document from Prismic
 *
 * - **API ID**: `artist`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type ArtistDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<Simplify<ArtistDocumentData>, "artist", Lang>;

/**
 * Item in *Event → Artists*
 */
export interface EventDocumentDataArtistsItem {
	/**
	 * Artist field in *Event → Artists*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.artists[].artist
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	artist: prismic.ContentRelationshipField<"artist">;
	
	/**
	 * Featured on card field in *Event → Artists*
	 *
	 * - **Field Type**: Boolean
	 * - **Placeholder**: *None*
	 * - **Default Value**: false
	 * - **API ID Path**: event.artists[].featured
	 * - **Documentation**: https://prismic.io/docs/fields/boolean
	 */
	featured: prismic.BooleanField;
}

/**
 * Item in *Event → CTAs*
 */
export interface EventDocumentDataCtasItem {
	/**
	 * Label field in *Event → CTAs*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Learn more
	 * - **API ID Path**: event.ctas[].label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	label: prismic.KeyTextField;
	
	/**
	 * Link field in *Event → CTAs*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.ctas[].link
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	link: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * Style field in *Event → CTAs*
	 *
	 * - **Field Type**: Select
	 * - **Placeholder**: *None*
	 * - **Default Value**: Outlined
	 * - **API ID Path**: event.ctas[].style
	 * - **Documentation**: https://prismic.io/docs/fields/select
	 */
	style: prismic.SelectField<"Outlined" | "Primary", "filled">;
}

type EventDocumentDataSlicesSlice = RichTextSlice | QuoteSlice

/**
 * Content for Event documents
 */
interface EventDocumentData {
	/**
	 * Title field in *Event*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.title
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * Category field in *Event*
	 *
	 * - **Field Type**: Select
	 * - **Placeholder**: *None*
	 * - **Default Value**: Event
	 * - **API ID Path**: event.category
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/select
	 */
	category: prismic.SelectField<"Event" | "Workshop" | "Scholarship", "filled">;
	
	/**
	 * Start Date field in *Event*
	 *
	 * - **Field Type**: Date
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.start_date
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/date
	 */
	start_date: prismic.DateField;
	
	/**
	 * End Date field in *Event*
	 *
	 * - **Field Type**: Date
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.end_date
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/date
	 */
	end_date: prismic.DateField;
	
	/**
	 * Date Label field in *Event*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: 7th & 8th November 2002
	 * - **API ID Path**: event.date_label
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	date_label: prismic.KeyTextField;
	
	/**
	 * Description field in *Event*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.description
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	description: prismic.RichTextField;
	
	/**
	 * Hero Image field in *Event*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.hero_image
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	hero_image: prismic.ImageField<never>;
	
	/**
	 * Venue field in *Event*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.venue
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	venue: prismic.KeyTextField;
	
	/**
	 * Venue Map Link field in *Event*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.venue_map_link
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	venue_map_link: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * Feature Label field in *Event*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Featuring:
	 * - **API ID Path**: event.feature_label
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	feature_label: prismic.KeyTextField;
	
	/**
	 * Artists field in *Event*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.artists[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	artists: prismic.GroupField<Simplify<EventDocumentDataArtistsItem>>;
	
	/**
	 * CTAs field in *Event*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.ctas[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	ctas: prismic.GroupField<Simplify<EventDocumentDataCtasItem>>;/**
	 * Slice Zone field in *Event*
	 *
	 * - **Field Type**: Slice Zone
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.slices[]
	 * - **Tab**: Body
	 * - **Documentation**: https://prismic.io/docs/slices
	 */
	slices: prismic.SliceZone<EventDocumentDataSlicesSlice>;/**
	 * Meta Title field in *Event*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Defaults to "{Title} by Svarit"
	 * - **API ID Path**: event.meta_title
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_title: prismic.KeyTextField;
	
	/**
	 * Meta Description field in *Event*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Defaults to the Description
	 * - **API ID Path**: event.meta_description
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_description: prismic.KeyTextField;
	
	/**
	 * Meta Image field in *Event*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.meta_image
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	meta_image: prismic.ImageField<never>;
}

/**
 * Event document from Prismic
 *
 * - **API ID**: `event`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type EventDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<Simplify<EventDocumentData>, "event", Lang>;

type PageDocumentDataSlicesSlice = HeroSlice | SponsorsSlice | AboutSlice | EventListSlice | DonateSlice | ContactSlice | ArtistListSlice | VolunteersSlice | RichTextSlice | QuoteSlice | LegalSectionSlice

/**
 * Content for Page documents
 */
interface PageDocumentData {
	/**
	 * Slice Zone field in *Page*
	 *
	 * - **Field Type**: Slice Zone
	 * - **Placeholder**: *None*
	 * - **API ID Path**: page.slices[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/slices
	 */
	slices: prismic.SliceZone<PageDocumentDataSlicesSlice>;/**
	 * Meta Title field in *Page*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Defaults to "{Page name} | Svarit"
	 * - **API ID Path**: page.meta_title
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_title: prismic.KeyTextField;
	
	/**
	 * Meta Description field in *Page*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Falls back to the site description
	 * - **API ID Path**: page.meta_description
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_description: prismic.KeyTextField;
	
	/**
	 * Meta Image field in *Page*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: page.meta_image
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	meta_image: prismic.ImageField<never>;
}

/**
 * Page document from Prismic
 *
 * - **API ID**: `page`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type PageDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<Simplify<PageDocumentData>, "page", Lang>;

/**
 * Item in *Site Settings → Socials*
 */
export interface SettingsDocumentDataSocialsItem {
	/**
	 * YouTube field in *Site Settings → Socials*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.socials[].youtube
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	youtube: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * Instagram field in *Site Settings → Socials*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.socials[].instagram
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	instagram: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * Facebook field in *Site Settings → Socials*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.socials[].facebook
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	facebook: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
}

/**
 * Item in *Site Settings → Navigation*
 */
export interface SettingsDocumentDataNavItem {
	/**
	 * Links field in *Site Settings → Navigation*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.nav[].links
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	links: prismic.Repeatable<prismic.LinkField<string, string, unknown, prismic.FieldState, never>>;
}

/**
 * Item in *Site Settings → Footer*
 */
export interface SettingsDocumentDataFooterItem {
	/**
	 * Copyright field in *Site Settings → Footer*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.footer[].copyright
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	copyright: prismic.KeyTextField;
	
	/**
	 * Credits field in *Site Settings → Footer*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.footer[].credits
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	credits: prismic.RichTextField;
}

/**
 * Item in *Site Settings → Footer Links*
 */
export interface SettingsDocumentDataFooterLinksItem {
	/**
	 * Links field in *Site Settings → Footer Links*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.footer_links[].links
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	links: prismic.Repeatable<prismic.LinkField<string, string, unknown, prismic.FieldState, never>>;
}

/**
 * Content for Site Settings documents
 */
interface SettingsDocumentData {
	/**
	 * Svarit Logo field in *Site Settings*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.logo
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	logo: prismic.ImageField<never>;
	
	/**
	 * Donation Link field in *Site Settings*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: https://rzp.io/l/svarit
	 * - **API ID Path**: settings.donationLink
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	donationLink: prismic.Repeatable<prismic.LinkField<string, string, unknown, prismic.FieldState, never>>;
	
	/**
	 * Socials field in *Site Settings*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.socials[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	socials: prismic.GroupField<Simplify<SettingsDocumentDataSocialsItem>>;
	
	/**
	 * Navigation field in *Site Settings*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.nav[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	nav: prismic.GroupField<Simplify<SettingsDocumentDataNavItem>>;
	
	/**
	 * Footer field in *Site Settings*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.footer[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	footer: prismic.GroupField<Simplify<SettingsDocumentDataFooterItem>>;
	
	/**
	 * Footer Links field in *Site Settings*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.footer_links[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	footer_links: prismic.GroupField<Simplify<SettingsDocumentDataFooterLinksItem>>;/**
	 * Email field in *Site Settings*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: team@svarit.org
	 * - **API ID Path**: settings.email
	 * - **Tab**: Contact
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	email: prismic.KeyTextField;
	
	/**
	 * Phone (display) field in *Site Settings*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: +91 99307 59942
	 * - **API ID Path**: settings.phone
	 * - **Tab**: Contact
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	phone: prismic.KeyTextField;
	
	/**
	 * Phone (for tel: links and schema) field in *Site Settings*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: +91-99307-59942
	 * - **API ID Path**: settings.phone_e164
	 * - **Tab**: Contact
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	phone_e164: prismic.KeyTextField;
	
	/**
	 * Street Address field in *Site Settings*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Anandashram, 22 Pandita Ramabai Rd, Gamdevi
	 * - **API ID Path**: settings.address_street
	 * - **Tab**: Contact
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	address_street: prismic.KeyTextField;
	
	/**
	 * City field in *Site Settings*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Mumbai
	 * - **API ID Path**: settings.address_locality
	 * - **Tab**: Contact
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	address_locality: prismic.KeyTextField;
	
	/**
	 * State or Region field in *Site Settings*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Maharashtra
	 * - **API ID Path**: settings.address_region
	 * - **Tab**: Contact
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	address_region: prismic.KeyTextField;
	
	/**
	 * Postal Code field in *Site Settings*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: 400007
	 * - **API ID Path**: settings.address_postal_code
	 * - **Tab**: Contact
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	address_postal_code: prismic.KeyTextField;
	
	/**
	 * Country Code (ISO 3166-1 alpha-2) field in *Site Settings*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: IN
	 * - **API ID Path**: settings.address_country
	 * - **Tab**: Contact
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	address_country: prismic.KeyTextField;
}

/**
 * Site Settings document from Prismic
 *
 * - **API ID**: `settings`
 * - **Repeatable**: `false`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type SettingsDocument<Lang extends string = string> = prismic.PrismicDocumentWithoutUID<Simplify<SettingsDocumentData>, "settings", Lang>;

/**
 * Content for Thank You documents
 */
interface ThankYouDocumentData {
	/**
	 * Title field in *Thank You*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: thank_you.title
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * Body field in *Thank You*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: thank_you.body
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	body: prismic.RichTextField;
	
	/**
	 * CTA Label field in *Thank You*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Explore our initiatives
	 * - **API ID Path**: thank_you.cta_label
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	cta_label: prismic.KeyTextField;
	
	/**
	 * CTA Link field in *Thank You*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: thank_you.cta_link
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	cta_link: prismic.ContentRelationshipField<"page"> | prismic.ContentRelationshipField<"event">;/**
	 * Meta Title field in *Thank You*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Defaults to "Thank You | Svarit"
	 * - **API ID Path**: thank_you.meta_title
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_title: prismic.KeyTextField;
	
	/**
	 * Meta Description field in *Thank You*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Falls back to the site description
	 * - **API ID Path**: thank_you.meta_description
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_description: prismic.KeyTextField;
}

/**
 * Thank You document from Prismic
 *
 * - **API ID**: `thank_you`
 * - **Repeatable**: `false`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type ThankYouDocument<Lang extends string = string> = prismic.PrismicDocumentWithoutUID<Simplify<ThankYouDocumentData>, "thank_you", Lang>;

/**
 * Content for Volunteer documents
 */
interface VolunteerDocumentData {
	/**
	 * Name field in *Volunteer*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: volunteer.name
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	name: prismic.KeyTextField;
	
	/**
	 * Photo field in *Volunteer*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: volunteer.photo
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	photo: prismic.ImageField<never>;
	
	/**
	 * Role field in *Volunteer*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: volunteer.role
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	role: prismic.KeyTextField;
}

/**
 * Volunteer document from Prismic
 *
 * - **API ID**: `volunteer`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type VolunteerDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<Simplify<VolunteerDocumentData>, "volunteer", Lang>;

/**
 * Item in *Welcome Updates → Variants*
 */
export interface WelcomeUpdatesDocumentDataVariantsItem {
	/**
	 * Source field in *Welcome Updates → Variants*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: centenary (leave empty for the default)
	 * - **API ID Path**: welcome_updates.variants[].source
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	source: prismic.KeyTextField;
	
	/**
	 * Title field in *Welcome Updates → Variants*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: welcome_updates.variants[].title
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * Body field in *Welcome Updates → Variants*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: welcome_updates.variants[].body
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	body: prismic.RichTextField;
	
	/**
	 * CTA Label field in *Welcome Updates → Variants*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Explore our initiatives
	 * - **API ID Path**: welcome_updates.variants[].cta_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	cta_label: prismic.KeyTextField;
	
	/**
	 * CTA Link field in *Welcome Updates → Variants*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: welcome_updates.variants[].cta_link
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	cta_link: prismic.ContentRelationshipField<"page"> | prismic.ContentRelationshipField<"event">;
}

/**
 * Content for Welcome Updates documents
 */
interface WelcomeUpdatesDocumentData {
	/**
	 * Variants field in *Welcome Updates*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: welcome_updates.variants[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	variants: prismic.GroupField<Simplify<WelcomeUpdatesDocumentDataVariantsItem>>;/**
	 * Meta Title field in *Welcome Updates*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Defaults to "Welcome Updates | Svarit"
	 * - **API ID Path**: welcome_updates.meta_title
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_title: prismic.KeyTextField;
	
	/**
	 * Meta Description field in *Welcome Updates*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Falls back to the site description
	 * - **API ID Path**: welcome_updates.meta_description
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_description: prismic.KeyTextField;
}

/**
 * Welcome Updates document from Prismic
 *
 * - **API ID**: `welcome_updates`
 * - **Repeatable**: `false`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type WelcomeUpdatesDocument<Lang extends string = string> = prismic.PrismicDocumentWithoutUID<Simplify<WelcomeUpdatesDocumentData>, "welcome_updates", Lang>;

export type AllDocumentTypes = ArtistDocument | EventDocument | PageDocument | SettingsDocument | ThankYouDocument | VolunteerDocument | WelcomeUpdatesDocument;

/**
 * Primary content in *About → Default → Primary*
 */
export interface AboutSliceDefaultPrimary {
	/**
	 * Heading field in *About → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: about.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *About → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: about.default.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
	
	/**
	 * Body field in *About → Default → Primary*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: about.default.primary.body
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	body: prismic.RichTextField;
	
	/**
	 * Stats field in *About → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: 20+ Volunteers
	 * - **API ID Path**: about.default.primary.stats
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	stats: prismic.KeyTextField;
}

/**
 * Default variation for About Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type AboutSliceDefault = prismic.SharedSliceVariation<"default", Simplify<AboutSliceDefaultPrimary>, never>;

/**
 * Slice variation for *About*
 */
type AboutSliceVariation = AboutSliceDefault

/**
 * About Shared Slice
 *
 * - **API ID**: `about`
 * - **Description**: Mission statement with the volunteer avatars pulled from Site Settings.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type AboutSlice = prismic.SharedSlice<"about", AboutSliceVariation>;

/**
 * Primary content in *ArtistList → Default → Primary*
 */
export interface ArtistListSliceDefaultPrimary {
	/**
	 * Heading field in *ArtistList → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist_list.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *ArtistList → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist_list.default.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
}

/**
 * Default variation for ArtistList Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ArtistListSliceDefault = prismic.SharedSliceVariation<"default", Simplify<ArtistListSliceDefaultPrimary>, never>;

/**
 * Slice variation for *ArtistList*
 */
type ArtistListSliceVariation = ArtistListSliceDefault

/**
 * ArtistList Shared Slice
 *
 * - **API ID**: `artist_list`
 * - **Description**: A grid of every Artist document, each card linking to its page.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ArtistListSlice = prismic.SharedSlice<"artist_list", ArtistListSliceVariation>;

/**
 * Primary content in *Contact → Default → Primary*
 */
export interface ContactSliceDefaultPrimary {
	/**
	 * Heading field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: We'd Love to Hear from You
	 * - **API ID Path**: contact.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Contact Us
	 * - **API ID Path**: contact.default.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
	
	/**
	 * Description field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: contact.default.primary.description
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	description: prismic.RichTextField;
	
	/**
	 * Name Label field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Name
	 * - **API ID Path**: contact.default.primary.name_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	name_label: prismic.KeyTextField;
	
	/**
	 * Email Label field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Email
	 * - **API ID Path**: contact.default.primary.email_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	email_label: prismic.KeyTextField;
	
	/**
	 * Message Label field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Message
	 * - **API ID Path**: contact.default.primary.message_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	message_label: prismic.KeyTextField;
	
	/**
	 * Submit Label field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Send Message
	 * - **API ID Path**: contact.default.primary.submit_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	submit_label: prismic.KeyTextField;
}

/**
 * Default variation for Contact Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ContactSliceDefault = prismic.SharedSliceVariation<"default", Simplify<ContactSliceDefaultPrimary>, never>;

/**
 * Slice variation for *Contact*
 */
type ContactSliceVariation = ContactSliceDefault

/**
 * Contact Shared Slice
 *
 * - **API ID**: `contact`
 * - **Description**: Contact form with an introduction alongside it.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ContactSlice = prismic.SharedSlice<"contact", ContactSliceVariation>;

/**
 * Primary content in *Donate → Default → Primary*
 */
export interface DonateSliceDefaultPrimary {
	/**
	 * Heading field in *Donate → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Join us in shaping the future of Indian Music.
	 * - **API ID Path**: donate.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * CTA Label field in *Donate → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Donate to Svarit
	 * - **API ID Path**: donate.default.primary.cta_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	cta_label: prismic.KeyTextField;
	
	/**
	 * CTA Link field in *Donate → Default → Primary*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: donate.default.primary.cta_link
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	cta_link: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * Background Image field in *Donate → Default → Primary*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: donate.default.primary.background_image
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	background_image: prismic.ImageField<never>;
}

/**
 * Default variation for Donate Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type DonateSliceDefault = prismic.SharedSliceVariation<"default", Simplify<DonateSliceDefaultPrimary>, never>;

/**
 * Slice variation for *Donate*
 */
type DonateSliceVariation = DonateSliceDefault

/**
 * Donate Shared Slice
 *
 * - **API ID**: `donate`
 * - **Description**: Full width image with a donation call to action floating over it.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type DonateSlice = prismic.SharedSlice<"donate", DonateSliceVariation>;

/**
 * Item in *EventList → Timeline → Primary → Chosen Initiatives*
 */
export interface EventListSliceTimelinePrimaryInitiativesItem {
	/**
	 * Initiative field in *EventList → Timeline → Primary → Chosen Initiatives*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event_list.timeline.primary.initiatives[].initiative
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	initiative: prismic.ContentRelationshipField<"event">;
}

/**
 * Primary content in *EventList → Tabs → Primary*
 */
export interface EventListSliceDefaultPrimary {
	/**
	 * Heading field in *EventList → Tabs → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event_list.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *EventList → Tabs → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Our Initiatives
	 * - **API ID Path**: event_list.default.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
	
	/**
	 * Timeframe field in *EventList → Tabs → Primary*
	 *
	 * - **Field Type**: Select
	 * - **Placeholder**: *None*
	 * - **Default Value**: All
	 * - **API ID Path**: event_list.default.primary.timeframe
	 * - **Documentation**: https://prismic.io/docs/fields/select
	 */
	timeframe: prismic.SelectField<"All" | "Upcoming" | "Past", "filled">;
	
	/**
	 * Limit field in *EventList → Tabs → Primary*
	 *
	 * - **Field Type**: Boolean
	 * - **Placeholder**: *None*
	 * - **Default Value**: true
	 * - **API ID Path**: event_list.default.primary.limit
	 * - **Documentation**: https://prismic.io/docs/fields/boolean
	 */
	limit: prismic.BooleanField;
}

/**
 * Tabs variation for EventList Slice
 *
 * - **API ID**: `default`
 * - **Description**: Events and Workshops tabs with load more
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type EventListSliceDefault = prismic.SharedSliceVariation<"default", Simplify<EventListSliceDefaultPrimary>, never>;

/**
 * Primary content in *EventList → Grid → Primary*
 */
export interface EventListSliceGridPrimary {
	/**
	 * Heading field in *EventList → Grid → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event_list.grid.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *EventList → Grid → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event_list.grid.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
	
	/**
	 * Category field in *EventList → Grid → Primary*
	 *
	 * - **Field Type**: Select
	 * - **Placeholder**: *None*
	 * - **Default Value**: All
	 * - **API ID Path**: event_list.grid.primary.category
	 * - **Documentation**: https://prismic.io/docs/fields/select
	 */
	category: prismic.SelectField<"All" | "Event" | "Workshop", "filled">;
	
	/**
	 * Timeframe field in *EventList → Grid → Primary*
	 *
	 * - **Field Type**: Select
	 * - **Placeholder**: *None*
	 * - **Default Value**: All
	 * - **API ID Path**: event_list.grid.primary.timeframe
	 * - **Documentation**: https://prismic.io/docs/fields/select
	 */
	timeframe: prismic.SelectField<"All" | "Upcoming" | "Past", "filled">;
	
	/**
	 * Limit field in *EventList → Grid → Primary*
	 *
	 * - **Field Type**: Boolean
	 * - **Placeholder**: *None*
	 * - **Default Value**: true
	 * - **API ID Path**: event_list.grid.primary.limit
	 * - **Documentation**: https://prismic.io/docs/fields/boolean
	 */
	limit: prismic.BooleanField;
}

/**
 * Grid variation for EventList Slice
 *
 * - **API ID**: `grid`
 * - **Description**: One flat grid of event cards, filtered by category
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type EventListSliceGrid = prismic.SharedSliceVariation<"grid", Simplify<EventListSliceGridPrimary>, never>;

/**
 * Primary content in *EventList → Timeline → Primary*
 */
export interface EventListSliceTimelinePrimary {
	/**
	 * Heading field in *EventList → Timeline → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event_list.timeline.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *EventList → Timeline → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Celebrations
	 * - **API ID Path**: event_list.timeline.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
	
	/**
	 * Source field in *EventList → Timeline → Primary*
	 *
	 * - **Field Type**: Select
	 * - **Placeholder**: *None*
	 * - **Default Value**: Upcoming
	 * - **API ID Path**: event_list.timeline.primary.source
	 * - **Documentation**: https://prismic.io/docs/fields/select
	 */
	source: prismic.SelectField<"Upcoming" | "Chosen", "filled">;
	
	/**
	 * Chosen Initiatives field in *EventList → Timeline → Primary*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event_list.timeline.primary.initiatives[]
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	initiatives: prismic.GroupField<Simplify<EventListSliceTimelinePrimaryInitiativesItem>>;
	
	/**
	 * Max Items field in *EventList → Timeline → Primary*
	 *
	 * - **Field Type**: Number
	 * - **Placeholder**: Leave empty to show all
	 * - **API ID Path**: event_list.timeline.primary.max_items
	 * - **Documentation**: https://prismic.io/docs/fields/number
	 */
	max_items: prismic.NumberField;
	
	/**
	 * More Label field in *EventList → Timeline → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Show more initiatives
	 * - **API ID Path**: event_list.timeline.primary.more_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	more_label: prismic.KeyTextField;
	
	/**
	 * More Link field in *EventList → Timeline → Primary*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event_list.timeline.primary.more_link
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	more_link: prismic.ContentRelationshipField<"page">;
	
	/**
	 * Show signup form field in *EventList → Timeline → Primary*
	 *
	 * - **Field Type**: Boolean
	 * - **Placeholder**: *None*
	 * - **Default Value**: true
	 * - **API ID Path**: event_list.timeline.primary.show_signup
	 * - **Documentation**: https://prismic.io/docs/fields/boolean
	 */
	show_signup: prismic.BooleanField;
	
	/**
	 * Signup Heading field in *EventList → Timeline → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A Year-Long Musical Celebration
	 * - **API ID Path**: event_list.timeline.primary.signup_heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	signup_heading: prismic.KeyTextField;
	
	/**
	 * Signup Button Label field in *EventList → Timeline → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Sign up for updates
	 * - **API ID Path**: event_list.timeline.primary.signup_cta_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	signup_cta_label: prismic.KeyTextField;
	
	/**
	 * Signup Event Type field in *EventList → Timeline → Primary*
	 *
	 * - **Field Type**: Select
	 * - **Placeholder**: *None*
	 * - **Default Value**: $opt.in
	 * - **API ID Path**: event_list.timeline.primary.signup_event_type
	 * - **Documentation**: https://prismic.io/docs/fields/select
	 */
	signup_event_type: prismic.SelectField<"$opt.in" | "$opt.in.centenary", "filled">;
}

/**
 * Timeline variation for EventList Slice
 *
 * - **API ID**: `timeline`
 * - **Description**: Vertical timeline of initiatives with featured artists and an optional signup form
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type EventListSliceTimeline = prismic.SharedSliceVariation<"timeline", Simplify<EventListSliceTimelinePrimary>, never>;

/**
 * Slice variation for *EventList*
 */
type EventListSliceVariation = EventListSliceDefault | EventListSliceGrid | EventListSliceTimeline

/**
 * EventList Shared Slice
 *
 * - **API ID**: `event_list`
 * - **Description**: Lists Event documents. Tabs splits them into Events and Workshops, Grid shows one flat filtered grid.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type EventListSlice = prismic.SharedSlice<"event_list", EventListSliceVariation>;

/**
 * Item in *Hero → Default → Primary → Images*
 */
export interface HeroSliceDefaultPrimaryImagesItem {
	/**
	 * Image field in *Hero → Default → Primary → Images*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.default.primary.images[].image
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	image: prismic.ImageField<never>;
}

/**
 * Primary content in *Hero → Default → Primary*
 */
export interface HeroSliceDefaultPrimary {
	/**
	 * Title field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Ushering in the Next Era of Indian Music
	 * - **API ID Path**: hero.default.primary.title
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * Subtitle field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.default.primary.subtitle
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	subtitle: prismic.RichTextField;
	
	/**
	 * Banner Initiative field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.default.primary.banner_initiative
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	banner_initiative: prismic.ContentRelationshipField<"event">;
	
	/**
	 * Banner Text field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Join us as we celebrate...
	 * - **API ID Path**: hero.default.primary.banner_text
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	banner_text: prismic.KeyTextField;
	
	/**
	 * Banner Link field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.default.primary.banner_link
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	banner_link: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * Banner CTA Label field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Learn more
	 * - **API ID Path**: hero.default.primary.banner_cta_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	banner_cta_label: prismic.KeyTextField;
	
	/**
	 * CTA Label field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Learn more
	 * - **API ID Path**: hero.default.primary.cta_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	cta_label: prismic.KeyTextField;
	
	/**
	 * CTA Link field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.default.primary.cta_link
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	cta_link: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * Stats field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: 20+ Volunteers
	 * - **API ID Path**: hero.default.primary.stats
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	stats: prismic.KeyTextField;
	
	/**
	 * Images field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.default.primary.images[]
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	images: prismic.GroupField<Simplify<HeroSliceDefaultPrimaryImagesItem>>;
	
	/**
	 * Video field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Link to Media
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.default.primary.video
	 * - **Documentation**: https://prismic.io/docs/fields/link-to-media
	 */
	video: prismic.LinkToMediaField<prismic.FieldState, never>;
}

/**
 * Default variation for Hero Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type HeroSliceDefault = prismic.SharedSliceVariation<"default", Simplify<HeroSliceDefaultPrimary>, never>;

/**
 * Primary content in *Hero → Page Header → Primary*
 */
export interface HeroSlicePageHeaderPrimary {
	/**
	 * Title field in *Hero → Page Header → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.page_header.primary.title
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * Description field in *Hero → Page Header → Primary*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.page_header.primary.description
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	description: prismic.RichTextField;
}

/**
 * Page Header variation for Hero Slice
 *
 * - **API ID**: `page_header`
 * - **Description**: Title and a short lead paragraph for the top of an interior page.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type HeroSlicePageHeader = prismic.SharedSliceVariation<"page_header", Simplify<HeroSlicePageHeaderPrimary>, never>;

/**
 * Slice variation for *Hero*
 */
type HeroSliceVariation = HeroSliceDefault | HeroSlicePageHeader

/**
 * Hero Shared Slice
 *
 * - **API ID**: `hero`
 * - **Description**: Opening section of the homepage: headline, call to action and a trio of media panels.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type HeroSlice = prismic.SharedSlice<"hero", HeroSliceVariation>;

/**
 * Primary content in *LegalSection → Default → Primary*
 */
export interface LegalSectionSliceDefaultPrimary {
	/**
	 * Heading field in *LegalSection → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Renders as an h2
	 * - **API ID Path**: legal_section.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Content field in *LegalSection → Default → Primary*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: legal_section.default.primary.content
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	content: prismic.RichTextField;
	
	/**
	 * Append Block field in *LegalSection → Default → Primary*
	 *
	 * - **Field Type**: Select
	 * - **Placeholder**: Live content added after the text above, read from Settings
	 * - **Default Value**: none
	 * - **API ID Path**: legal_section.default.primary.append_block
	 * - **Documentation**: https://prismic.io/docs/fields/select
	 */
	append_block: prismic.SelectField<"none" | "contact_details" | "last_updated" | "complaints_contact", "filled">;
	
	/**
	 * Updated At (only read when Append Block is "last_updated") field in *LegalSection → Default → Primary*
	 *
	 * - **Field Type**: Date
	 * - **Placeholder**: *None*
	 * - **API ID Path**: legal_section.default.primary.updated_at
	 * - **Documentation**: https://prismic.io/docs/fields/date
	 */
	updated_at: prismic.DateField;
}

/**
 * Default variation for LegalSection Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type LegalSectionSliceDefault = prismic.SharedSliceVariation<"default", Simplify<LegalSectionSliceDefaultPrimary>, never>;

/**
 * Slice variation for *LegalSection*
 */
type LegalSectionSliceVariation = LegalSectionSliceDefault

/**
 * LegalSection Shared Slice
 *
 * - **API ID**: `legal_section`
 * - **Description**: One section of a legal or policy page: a heading, rich text prose, and an optional block of live contact or date info appended after it.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type LegalSectionSlice = prismic.SharedSlice<"legal_section", LegalSectionSliceVariation>;

/**
 * Primary content in *Quote → Default → Primary*
 */
export interface QuoteSliceDefaultPrimary {
	/**
	 * Quote field in *Quote → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: quote.default.primary.quote
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	quote: prismic.KeyTextField;
	
	/**
	 * Attribution field in *Quote → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: quote.default.primary.attribution
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	attribution: prismic.KeyTextField;
	
	/**
	 * Paragraph field in *Quote → Default → Primary*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: quote.default.primary.paragraph
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	paragraph: prismic.RichTextField;
}

/**
 * Default variation for Quote Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type QuoteSliceDefault = prismic.SharedSliceVariation<"default", Simplify<QuoteSliceDefaultPrimary>, never>;

/**
 * Slice variation for *Quote*
 */
type QuoteSliceVariation = QuoteSliceDefault

/**
 * Quote Shared Slice
 *
 * - **API ID**: `quote`
 * - **Description**: A short pull quote with an optional attribution and an optional supporting paragraph beside it.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type QuoteSlice = prismic.SharedSlice<"quote", QuoteSliceVariation>;

/**
 * Primary content in *RichText → Default → Primary*
 */
export interface RichTextSliceDefaultPrimary {
	/**
	 * Content field in *RichText → Default → Primary*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: rich_text.default.primary.content
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	content: prismic.RichTextField;
}

/**
 * Default variation for RichText Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type RichTextSliceDefault = prismic.SharedSliceVariation<"default", Simplify<RichTextSliceDefaultPrimary>, never>;

/**
 * Slice variation for *RichText*
 */
type RichTextSliceVariation = RichTextSliceDefault

/**
 * RichText Shared Slice
 *
 * - **API ID**: `rich_text`
 * - **Description**: A block of formatted copy for event and artist pages.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type RichTextSlice = prismic.SharedSlice<"rich_text", RichTextSliceVariation>;

/**
 * Item in *Sponsors → Default → Primary → Logos*
 */
export interface SponsorsSliceDefaultPrimaryLogosItem {
	/**
	 * Logo field in *Sponsors → Default → Primary → Logos*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: sponsors.default.primary.logos[].logo
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	logo: prismic.ImageField<never>;
	
	/**
	 * Name field in *Sponsors → Default → Primary → Logos*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: sponsors.default.primary.logos[].name
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	name: prismic.KeyTextField;
}

/**
 * Primary content in *Sponsors → Default → Primary*
 */
export interface SponsorsSliceDefaultPrimary {
	/**
	 * Heading field in *Sponsors → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: The Champions of Our Mission So Far
	 * - **API ID Path**: sponsors.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *Sponsors → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Previous Sponsors
	 * - **API ID Path**: sponsors.default.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
	
	/**
	 * Logos field in *Sponsors → Default → Primary*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: sponsors.default.primary.logos[]
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	logos: prismic.GroupField<Simplify<SponsorsSliceDefaultPrimaryLogosItem>>;
}

/**
 * Default variation for Sponsors Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type SponsorsSliceDefault = prismic.SharedSliceVariation<"default", Simplify<SponsorsSliceDefaultPrimary>, never>;

/**
 * Slice variation for *Sponsors*
 */
type SponsorsSliceVariation = SponsorsSliceDefault

/**
 * Sponsors Shared Slice
 *
 * - **API ID**: `sponsors`
 * - **Description**: Auto scrolling marquee of sponsor logos.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type SponsorsSlice = prismic.SharedSlice<"sponsors", SponsorsSliceVariation>;

/**
 * Primary content in *Volunteers → Default → Primary*
 */
export interface VolunteersSliceDefaultPrimary {
	/**
	 * Heading field in *Volunteers → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: volunteers.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *Volunteers → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: volunteers.default.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
}

/**
 * Default variation for Volunteers Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type VolunteersSliceDefault = prismic.SharedSliceVariation<"default", Simplify<VolunteersSliceDefaultPrimary>, never>;

/**
 * Slice variation for *Volunteers*
 */
type VolunteersSliceVariation = VolunteersSliceDefault

/**
 * Volunteers Shared Slice
 *
 * - **API ID**: `volunteers`
 * - **Description**: A full grid of every Volunteer document.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type VolunteersSlice = prismic.SharedSlice<"volunteers", VolunteersSliceVariation>;

declare module "@prismicio/client" {
	interface CreateClient {
		(repositoryNameOrEndpoint: string, options?: prismic.ClientConfig): prismic.Client<AllDocumentTypes>;
	}
	
	interface CreateWriteClient {
		(repositoryNameOrEndpoint: string, options: prismic.WriteClientConfig): prismic.WriteClient<AllDocumentTypes>;
	}
	
	interface CreateMigration {
		(): prismic.Migration<AllDocumentTypes>;
	}
	
	namespace Content {
		export type {
			ArtistDocument,
			ArtistDocumentData,
			ArtistDocumentDataSlicesSlice,
			EventDocument,
			EventDocumentData,
			EventDocumentDataArtistsItem,
			EventDocumentDataCtasItem,
			EventDocumentDataSlicesSlice,
			PageDocument,
			PageDocumentData,
			PageDocumentDataSlicesSlice,
			SettingsDocument,
			SettingsDocumentData,
			SettingsDocumentDataSocialsItem,
			SettingsDocumentDataNavItem,
			SettingsDocumentDataFooterItem,
			SettingsDocumentDataFooterLinksItem,
			ThankYouDocument,
			ThankYouDocumentData,
			VolunteerDocument,
			VolunteerDocumentData,
			WelcomeUpdatesDocument,
			WelcomeUpdatesDocumentData,
			WelcomeUpdatesDocumentDataVariantsItem,
			AllDocumentTypes,
			AboutSlice,
			AboutSliceDefaultPrimary,
			AboutSliceVariation,
			AboutSliceDefault,
			ArtistListSlice,
			ArtistListSliceDefaultPrimary,
			ArtistListSliceVariation,
			ArtistListSliceDefault,
			ContactSlice,
			ContactSliceDefaultPrimary,
			ContactSliceVariation,
			ContactSliceDefault,
			DonateSlice,
			DonateSliceDefaultPrimary,
			DonateSliceVariation,
			DonateSliceDefault,
			EventListSlice,
			EventListSliceDefaultPrimary,
			EventListSliceGridPrimary,
			EventListSliceTimelinePrimaryInitiativesItem,
			EventListSliceTimelinePrimary,
			EventListSliceVariation,
			EventListSliceDefault,
			EventListSliceGrid,
			EventListSliceTimeline,
			HeroSlice,
			HeroSliceDefaultPrimaryImagesItem,
			HeroSliceDefaultPrimary,
			HeroSlicePageHeaderPrimary,
			HeroSliceVariation,
			HeroSliceDefault,
			HeroSlicePageHeader,
			LegalSectionSlice,
			LegalSectionSliceDefaultPrimary,
			LegalSectionSliceVariation,
			LegalSectionSliceDefault,
			QuoteSlice,
			QuoteSliceDefaultPrimary,
			QuoteSliceVariation,
			QuoteSliceDefault,
			RichTextSlice,
			RichTextSliceDefaultPrimary,
			RichTextSliceVariation,
			RichTextSliceDefault,
			SponsorsSlice,
			SponsorsSliceDefaultPrimaryLogosItem,
			SponsorsSliceDefaultPrimary,
			SponsorsSliceVariation,
			SponsorsSliceDefault,
			VolunteersSlice,
			VolunteersSliceDefaultPrimary,
			VolunteersSliceVariation,
			VolunteersSliceDefault
		}
	}
}